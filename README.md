# ☕ Brew Focus

A retro pixel-art productivity timer. Your coffee drains while you focus and refills on your break. Every session is logged, so you can see your habits over time and furnish a little pixel café as you go.

**Stack:** React 19 + Vite · Python / Flask 3 + SQLAlchemy 2 · SQLite

## Features

**Flexible focus**
- **Rhythms beyond 25/5:** Pomodoro (25/5), 52/17, Animedoro (50/10), Deep Work (90/20), plus your own saved custom modes.
- **Intention first:** before each block you type a micro-goal. Optional box breathing (4-4-4-4) eases you into deep work.
- **Reflection after:** when a block ends you write one sentence about what you got done. It's saved to your journal.

**Ambience & audio** (all synthesized in the browser, with no audio files)
- **Layered soundscapes:** mix rain, café, fireplace and lo-fi keys with separate volumes, or load your own audio file.
- **Ticking:** choose off, a mechanical clock, or an "ominous" heartbeat. The final minute ticks louder.

**Staying on task**
- **Strict mode:** warns before you close the tab mid-brew and logs every tab switch as a distraction.
- **Live tab:** the page title counts down and the favicon's coffee drains, so the timer is readable from any tab.
- Background notifications and 8-bit chimes. Keyboard shortcuts: `Space` start/pause, `R` reset, `S` finish early / skip break.

**Progress**
- **Consistency grid:** a GitHub-style heatmap of focus minutes per day over the last year, plus current and best streaks.
- **Your café:** full brews (blocks that run all the way to 00:00) unlock pixel decorations, from a sprout at 1 up to a golden mug at 100.
- **Brew journal:** each session's intention, reflection, length and distractions.

## Quick start

Requires Python 3.9+ and Node 20+.

```bash
make install        # venv + pip install, npm install
make api            # terminal 1: Flask API on :5001
make web            # terminal 2: Vite on :5173 → open http://localhost:5173
```

Single-process production mode: `make serve` builds the frontend, and Flask serves both the app and the API at http://localhost:5001.

Run the backend tests with `make test`.

> Port 5001 is used because macOS reserves 5000 for AirPlay.

## Deploying

**GitHub Pages (frontend only).** Every push to `main` runs [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml), which builds the React app and publishes it. One-time setup: repo **Settings → Pages → Source: GitHub Actions**. Pages can only serve static files, so this build can't reach Flask. It is built with `VITE_STORAGE=browser`, which stores modes and sessions in the visitor's browser instead, with the same features.

**Full stack.** To run Flask and SQLite together, deploy to any host that runs Python and use `make serve`, where Flask serves the built app and the API from one process.

## Project structure

```
backend/
  brewfocus/
    __init__.py      app factory; serves frontend/dist in production
    models.py        Preset (custom modes), FocusSession (the log)
    api.py           REST endpoints + validation + streak/heatmap stats
  tests/test_api.py
frontend/
  src/
    App.jsx          session flow: intention → breathe → focus → reflect → break
    api.js           Flask client; localApi.js is the browser-storage twin for Pages
    hooks/           useTimer (wall-clock countdown), useLiveTab, useLocalState
    audio.js         Web Audio chimes, ticks and procedural ambience
    sprites.js       pixel art as text (icons + café items)
    components/      PixelMug, TimerStage, ModePicker, AmbienceMixer, Heatmap, …
    styles/          base / focus / progress CSS
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/presets` | List custom modes |
| `POST` | `/api/presets` | Save a mode `{name, focus, rest}` (minutes) |
| `DELETE` | `/api/presets/:id` | Delete a mode |
| `GET` | `/api/sessions?limit=30` | Recent sessions, newest first |
| `POST` | `/api/sessions` | Log a finished block `{mode, planned, focused, completed, intention, distractions, day}` |
| `PATCH` | `/api/sessions/:id` | Add a reflection `{reflection}` |
| `DELETE` | `/api/sessions` | Delete all sessions |
| `GET` | `/api/stats?today=YYYY-MM-DD` | Today, streaks, totals, per-day heatmap |

Sessions record the user's *local* calendar day, so streaks roll over at your midnight rather than UTC's.

## Design notes

- **Timer accuracy:** the countdown is computed from a deadline timestamp, not by counting ticks. The finish is a single `setTimeout`, which browsers don't batch the way they batch repeating timers, so it fires on time in a background tab.
- **Where state lives:** anything worth keeping (modes, sessions, reflections) is stored in SQLite. Per-device preferences (sound, ambience levels, selected mode) are kept in `localStorage`.
- **Out of scope for a web app:** blocking other apps and websites requires a browser extension or OS-level tool, and lock-screen widgets / Dynamic Island require a native app. Strict mode and the live tab are the web equivalents.
- Single-user, no auth. To host it for several people, add accounts and a `user_id` on both tables.

## License

MIT
