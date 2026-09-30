# ☕ Brew Focus

A retro pixel-art productivity tracker. Focus sessions run **on the server**, so they keep going when you close the tab, stay in sync across every tab and device you're signed in on, and add up to tasks, streaks and a year-long consistency grid.

**Stack:** Go 1.27 (Gin, GORM, SQLite, JWT) · Angular 22 (standalone components, signals, zoneless) · TypeScript · Server-Sent Events · Docker

**Live demo:** https://hrushibhatt.github.io/Productivity-Manager/. GitHub Pages can't run a server, so the demo runs the same API inside your browser (see [GitHub Pages](#github-pages)).

## How it works

```
 Angular (per tab)                         Go server
 ─────────────────                         ──────────────────────────────────────────────
 Timer / Brew services  ──HTTP──▶  Gin handlers ──▶ engine.Control(user, "pause")
        ▲                                                     │ command over a channel
        │                                                     ▼
        │                                   ┌── one goroutine per running timer ──┐
        │                                   │ owns its state; select on:          │
        │                                   │   commands · its deadline · ctx     │
        │                                   └──────────────┬──────────────────────┘
        │                                    persists to SQLite │ publishes events
        │                                                       ▼
        └──────── SSE: /api/events ◀──── events.Hub (one goroutine, channels only)
                                          fans out to every client of that user
```

- **Timer engine** ([`internal/engine`](backend/internal/engine/engine.go)). Each running timer is an actor: a goroutine that owns its state and handles commands (pause, resume, finish, cancel, distraction) sent over a channel, plus its own deadline. Nothing else touches timer state, so it needs no locks. Handlers wait on a reply channel for the new state.
- **Event hub** ([`internal/events`](backend/internal/events/hub.go)). A single goroutine owns the subscriber map. Subscribes, unsubscribes and publishes all arrive over channels. A client too slow to keep up is disconnected instead of blocking everyone else; its browser reconnects and gets a fresh snapshot.
- **Crash-safe.** Focus sessions are written to the database when they start and on every change. On boot, `Restore()` restarts every running or paused timer. A block whose deadline passed while the server was down completes immediately, with the full time credited.
- **Lifecycle.** An `errgroup` runs the hub, the engine and the HTTP server under one context. Ctrl+C or SIGTERM closes the event streams, drains requests, and waits for every timer goroutine to exit.
- **Clients render, the server decides.** The Angular `Timer` service derives the countdown from the server's deadline, corrected for clock skew, so every device shows the same clock.

## Features

- **Accounts.** Email and password (bcrypt), with a signed session in an HttpOnly cookie. Every record is scoped to its owner. Settings sync across devices.
- **Tasks.** Plan work with estimated focus blocks, brew a task, and track completed blocks against the estimate, plus minutes spent.
- **Rhythms.** Pomodoro 25/5, 52/17, Animedoro 50/10, Deep Work 90/20, and your own saved modes.
- **Intention → breathe → focus → reflect → break.** A micro-goal before each block, optional box breathing, and a one-sentence reflection saved to the journal.
- **Live sync.** Start on your laptop and pause on your phone. Every tab follows along, including the reflection prompt, which closes everywhere once one tab answers it.
- **Strict mode.** Tab switches during focus are logged on the server as distractions, and closing the tab asks first.
- **Ambience.** Rain, café, fireplace and lo-fi layers synthesized with Web Audio (no audio files), your own audio file, and optional clock or "ominous" ticking.
- **Progress.** Today, streaks, all-time totals, a GitHub-style heatmap, a pixel café that fills as you finish blocks, and the brew journal.
- **Live tab.** The page title counts down and the favicon's coffee drains.

## Quick start

Requires Go 1.27+ and Node 24.15+.

```bash
make install   # go mod download + npm install
make api       # terminal 1: Go API on :5001
make web       # terminal 2: Angular on :4200 → open http://localhost:4200
```

- `make serve` builds everything and runs a single Go process serving the app and the API on :5001.
- `make test` runs the Go tests under the race detector, then the Angular unit tests.
- `make docker` builds and runs the production image.
- `make demo` runs the GitHub Pages build locally, with no Go server needed.

> Port 5001 is used because macOS reserves 5000 for AirPlay.

**Configuration & secrets.** Copy [`.env.example`](.env.example) to `.env` and fill it in. The `make` targets load it, and git and Docker both ignore it. `JWT_SECRET` signs login cookies and is required in production (`openssl rand -hex 32`). Without it, a random key is generated and everyone is logged out on each restart. Set `SECURE_COOKIES=true` when serving over HTTPS.

## Project structure

```
backend/
  cmd/server/          main: config, errgroup lifecycle, graceful shutdown
  internal/
    engine/            server-run timers: one goroutine (actor) per active timer
    events/            pub/sub hub behind the SSE stream
    auth/              bcrypt, JWT cookie, Gin middleware
    store/             GORM models (User, Preset, Task, Session) + SQLite
    api/               Gin handlers: account, resources, timer + SSE, stats
frontend/src/app/
  core/                services: Api, Auth (+guard, interceptor), LiveEvents, Timer, Brew, Ambience
  core/local/          the in-browser backend used by the GitHub Pages build
  brew/                timer stage, tasks, modes, ambience mixer
  progress/            stats, heatmap, café shelf, journal (signal-driven resource())
  dialogs/             intention, breathing, reflection, settings
  shared/              pixel mug, sprite renderer, native <dialog> modal, pipes
Dockerfile             Angular build → static Go binary → distroless runtime
```

## API

All routes except `/api/health` and `/api/auth/*` require a session.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Account and session cookie |
| `GET` / `PUT` | `/api/me`, `/api/me/settings` | Profile and synced settings |
| `GET` / `POST` / `DELETE` | `/api/presets[/:id]` | Custom timing modes |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/tasks[/:id]` | Tasks, with brews and minutes logged against each |
| `GET` | `/api/timer` | The user's timer right now |
| `POST` | `/api/timer/:action` | `focus`, `break`, `pause`, `resume`, `finish`, `cancel`, `distraction` |
| `GET` | `/api/events` | SSE stream: `timer`, `session.completed`, `break.completed`, `session.reflected`, `changed` |
| `GET` / `PATCH` / `DELETE` | `/api/sessions[/:id]` | Journal and reflections |
| `GET` | `/api/stats?today=YYYY-MM-DD` | Today, streaks, totals and heatmap (in the user's local day) |

## Testing

- **Go.** The engine, hub and HTTP layer are covered, all under `-race`:
  - Timers finish on their deadline.
  - Paused timers never expire.
  - Restarts restore sessions.
  - Shutdown doesn't lose running sessions.
  - 50 users' timers can run at the same time.
  - Slow SSE clients are dropped without blocking others.
  - Users can't reach each other's data.
  - Two clients stay in sync over the event stream.
- **Angular (Vitest).** Clock-skew correction and out-of-order events in the timer, the session flow as driven by live events, and the in-browser backend replaying the Go API's test scenarios.
- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs both suites, builds the Docker image and, on `main`, publishes GitHub Pages.

## Deploying

The Dockerfile builds one small image: the Angular build and a static Go binary on a distroless, non-root base. Run it anywhere that runs containers (Fly.io, Render, Railway, a VPS) with a volume at `/data` for the SQLite database:

```bash
docker run -p 5001:5001 -v brewfocus-data:/data -e JWT_SECRET=… brew-focus
```

### GitHub Pages

On every push to `main`, CI builds the Pages version and publishes it to the `gh-pages` branch. GitHub's built-in **pages build and deployment** workflow then deploys it to https://hrushibhatt.github.io/Productivity-Manager/.

**One-time setup:** in the repository, go to **Settings → Pages → Build and deployment**. Set **Source** to *Deploy from a branch*, and **Branch** to `gh-pages`, folder `/ (root)`. The `gh-pages` branch appears after the first CI run on `main`.

Pages only serves static files, so this build (`ng build --configuration pages`) swaps the Go API for an in-browser backend ([`core/local`](frontend/src/app/core/local/local-backend.ts)):

- **Same app code.** It has the same routes, validation, status codes and live events, so the Angular app is unchanged. An HTTP interceptor answers `/api` requests in the browser.
- **Storage.** Data is kept in `localStorage`, and tabs stay in sync over a `BroadcastChannel`.
- **Timers.** Every open tab arms the running timer's deadline, and a cross-tab Web Lock makes exactly one tab finish each block. That's the browser's version of one goroutine per timer.
- **What's different.** The demo has no accounts, and data stays in that browser. Run the Go server (above) for accounts and sync across devices.
- **Deep links.** `404.html` is a copy of the app, so links like `/progress` load it directly.

## License

MIT
