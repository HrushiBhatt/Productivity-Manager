from datetime import date, timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import case, delete, func, select

from .models import FocusSession, Preset, db

api = Blueprint("api", __name__, url_prefix="/api")

HEATMAP_DAYS = 371  # 53 weeks, enough to fill a GitHub-style grid


class Invalid(Exception):
    pass


@api.errorhandler(Invalid)
def invalid(err):
    return jsonify(error=str(err)), 400


@api.errorhandler(404)
def not_found(_err):
    return jsonify(error="not found"), 404


# ---- validation helpers -------------------------------------------------


def _body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise Invalid("expected a JSON object")
    return data


def _int(data, key, lo, hi, default=None):
    value = data.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int) or not lo <= value <= hi:
        raise Invalid(f"{key} must be a whole number from {lo} to {hi}")
    return value


def _text(data, key, max_len, required=False):
    value = data.get(key, "")
    if not isinstance(value, str):
        raise Invalid(f"{key} must be text")
    value = value.strip()
    if required and not value:
        raise Invalid(f"{key} is required")
    if len(value) > max_len:
        raise Invalid(f"{key} must be at most {max_len} characters")
    return value


def _day(value, key="day"):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise Invalid(f"{key} must be a YYYY-MM-DD date") from None


# ---- presets ------------------------------------------------------------


@api.get("/health")
def health():
    return jsonify(ok=True)


@api.get("/presets")
def list_presets():
    presets = db.session.scalars(select(Preset).order_by(Preset.id))
    return jsonify([p.to_dict() for p in presets])


@api.post("/presets")
def create_preset():
    data = _body()
    preset = Preset(
        name=_text(data, "name", 32, required=True),
        focus_min=_int(data, "focus", 1, 180),
        rest_min=_int(data, "rest", 0, 60),
    )
    db.session.add(preset)
    db.session.commit()
    return jsonify(preset.to_dict()), 201


@api.delete("/presets/<int:preset_id>")
def delete_preset(preset_id):
    db.session.delete(db.get_or_404(Preset, preset_id))
    db.session.commit()
    return "", 204


# ---- sessions -----------------------------------------------------------


@api.get("/sessions")
def list_sessions():
    limit = min(max(request.args.get("limit", 20, type=int), 1), 100)
    query = select(FocusSession).order_by(FocusSession.id.desc()).limit(limit)
    return jsonify([s.to_dict() for s in db.session.scalars(query)])


@api.post("/sessions")
def create_session():
    data = _body()
    planned = _int(data, "planned", 60, 180 * 60)
    session = FocusSession(
        mode=_text(data, "mode", 32, required=True),
        planned_sec=planned,
        focused_sec=_int(data, "focused", 60, planned),
        completed=bool(data.get("completed")),
        intention=_text(data, "intention", 140),
        reflection=_text(data, "reflection", 280),
        distractions=_int(data, "distractions", 0, 999, default=0),
        day=_day(data.get("day")).isoformat(),
    )
    db.session.add(session)
    db.session.commit()
    return jsonify(session.to_dict()), 201


@api.patch("/sessions/<int:session_id>")
def reflect(session_id):
    session = db.get_or_404(FocusSession, session_id)
    session.reflection = _text(_body(), "reflection", 280)
    db.session.commit()
    return jsonify(session.to_dict())


@api.delete("/sessions")
def clear_sessions():
    db.session.execute(delete(FocusSession))
    db.session.commit()
    return "", 204


# ---- stats --------------------------------------------------------------


def _streaks(active, today):
    """Return (current, best) runs of consecutive active days.

    The current streak survives until the end of today, so it counts back
    from yesterday when nothing has been logged yet today.
    """
    best = run = 0
    prev = None
    for day in sorted(date.fromisoformat(d) for d in active):
        run = run + 1 if prev and day - prev == timedelta(days=1) else 1
        best = max(best, run)
        prev = day

    cursor = today if today.isoformat() in active else today - timedelta(days=1)
    current = 0
    while cursor.isoformat() in active:
        current += 1
        cursor -= timedelta(days=1)
    return current, best


@api.get("/stats")
def stats():
    today = _day(request.args.get("today", date.today().isoformat()), "today")
    rows = db.session.execute(
        select(
            FocusSession.day,
            func.count(FocusSession.id),
            func.sum(FocusSession.focused_sec),
            func.sum(case((FocusSession.completed, 1), else_=0)),
        ).group_by(FocusSession.day)
    ).all()

    minutes = {day: seconds // 60 for day, _, seconds, _ in rows}
    current, best = _streaks(set(minutes), today)
    cutoff = (today - timedelta(days=HEATMAP_DAYS)).isoformat()
    todays = next((r for r in rows if r[0] == today.isoformat()), None)

    return jsonify(
        today={"minutes": minutes.get(today.isoformat(), 0), "sessions": todays[1] if todays else 0},
        streak=current,
        best_streak=best,
        total={
            "minutes": sum(minutes.values()),
            "sessions": sum(r[1] for r in rows),
            "completed": sum(r[3] for r in rows),
        },
        heatmap={day: m for day, m in minutes.items() if day > cutoff},
    )
