from datetime import date, timedelta

import pytest

from brewfocus import create_app

TODAY = date(2026, 9, 30)


def day(offset):
    return (TODAY - timedelta(days=offset)).isoformat()


@pytest.fixture
def client():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite://"})
    return app.test_client()


def log(client, **overrides):
    body = {"mode": "Pomodoro", "planned": 1500, "focused": 1500, "completed": True, "day": day(0)}
    body.update(overrides)
    return client.post("/api/sessions", json=body)


def test_preset_crud(client):
    res = client.post("/api/presets", json={"name": " Thesis ", "focus": 75, "rest": 15})
    assert res.status_code == 201
    preset = res.get_json()
    assert preset == {"id": preset["id"], "name": "Thesis", "focus": 75, "rest": 15}

    assert client.get("/api/presets").get_json() == [preset]
    assert client.delete(f"/api/presets/{preset['id']}").status_code == 204
    assert client.get("/api/presets").get_json() == []
    assert client.delete(f"/api/presets/{preset['id']}").status_code == 404


@pytest.mark.parametrize(
    "body",
    [
        {"name": "", "focus": 25, "rest": 5},
        {"name": "x", "focus": 0, "rest": 5},
        {"name": "x", "focus": 25, "rest": 61},
        {"name": "x", "focus": "25", "rest": 5},
        {"name": "x", "focus": True, "rest": 5},
        {"name": "x" * 33, "focus": 25, "rest": 5},
    ],
)
def test_preset_validation(client, body):
    res = client.post("/api/presets", json=body)
    assert res.status_code == 400
    assert "error" in res.get_json()


def test_session_log_and_reflection(client):
    created = log(client, intention="Ship the heatmap", distractions=2).get_json()
    assert created["intention"] == "Ship the heatmap"
    assert created["created_at"].endswith("+00:00")

    res = client.patch(f"/api/sessions/{created['id']}", json={"reflection": "Done, plus tests."})
    assert res.get_json()["reflection"] == "Done, plus tests."

    log(client, completed=False, focused=600)
    listed = client.get("/api/sessions").get_json()
    assert [s["focused"] for s in listed] == [600, 1500]  # newest first


def test_session_validation(client):
    assert log(client, focused=30).status_code == 400  # under a minute
    assert log(client, focused=2000).status_code == 400  # more than planned
    assert log(client, day="30/09/2026").status_code == 400
    assert client.post("/api/sessions", data="nope").status_code == 400


def test_stats_streaks_and_heatmap(client):
    for offset in (0, 1, 3, 4, 5, 400):
        log(client, day=day(offset))
    log(client, day=day(0), completed=False, focused=600)

    stats = client.get(f"/api/stats?today={TODAY}").get_json()
    assert stats["today"] == {"minutes": 35, "sessions": 2}
    assert stats["streak"] == 2
    assert stats["best_streak"] == 3
    assert stats["total"] == {"minutes": 6 * 25 + 10, "sessions": 7, "completed": 6}
    assert day(400) not in stats["heatmap"]
    assert stats["heatmap"][day(3)] == 25


def test_streak_survives_until_end_of_today(client):
    log(client, day=day(1))
    log(client, day=day(2))
    assert client.get(f"/api/stats?today={TODAY}").get_json()["streak"] == 2
    assert client.get(f"/api/stats?today={day(-1)}").get_json()["streak"] == 0


def test_clear_sessions(client):
    log(client)
    assert client.delete("/api/sessions").status_code == 204
    assert client.get("/api/stats").get_json()["total"]["sessions"] == 0


def test_unknown_api_route_is_json_404(client):
    res = client.get("/api/nope")
    assert res.status_code == 404
    assert res.get_json() == {"error": "not found"}
