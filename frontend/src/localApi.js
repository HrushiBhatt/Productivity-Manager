import { localDay } from './time';

/**
 * Browser-only stand-in for the Flask API, used by the static GitHub Pages
 * build (VITE_STORAGE=browser), where there is no server to talk to. Same
 * methods and response shapes as the server API; data lives in localStorage.
 */

const KEY = 'brew:data';
const HEATMAP_DAYS = 371;

let memory; // used as-is when localStorage is unavailable (e.g. some private modes)

function read() {
  try {
    const saved = localStorage.getItem(KEY); // the source of truth whenever storage works
    memory = saved ? JSON.parse(saved) : null;
  } catch {
    // Storage blocked or corrupt: carry on with what's in memory.
  }
  return (memory ??= { nextId: 1, presets: [], sessions: [] });
}

function write(db) {
  memory = db;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Data survives until the tab closes.
  }
}

function wholeNumber(value, key, lo, hi) {
  if (!Number.isInteger(value) || value < lo || value > hi) {
    throw new Error(`${key} must be a whole number from ${lo} to ${hi}`);
  }
  return value;
}

/** "2026-09-30" shifted by n days, in the same local YYYY-MM-DD form. */
function shift(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

/** Current and best runs of consecutive active days (mirrors backend/brewfocus/api.py). */
function streaks(active, today) {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of [...active].sort()) {
    run = prev && shift(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  let current = 0;
  for (let cursor = active.has(today) ? today : shift(today, -1); active.has(cursor); cursor = shift(cursor, -1)) {
    current += 1;
  }
  return [current, best];
}

export const localApi = {
  async presets() {
    return read().presets;
  },

  async createPreset({ name, focus, rest }) {
    const trimmed = String(name ?? '').trim();
    if (!trimmed) throw new Error('name is required');
    if (trimmed.length > 32) throw new Error('name must be at most 32 characters');
    const values = { focus: wholeNumber(focus, 'focus', 1, 180), rest: wholeNumber(rest, 'rest', 0, 60) };
    const db = read();
    const preset = { id: db.nextId++, name: trimmed, ...values };
    db.presets.push(preset);
    write(db);
    return preset;
  },

  async deletePreset(id) {
    const db = read();
    db.presets = db.presets.filter((p) => p.id !== id);
    write(db);
    return null;
  },

  async sessions(limit = 30) {
    return read().sessions.slice(-limit).reverse();
  },

  async logSession(session) {
    const db = read();
    const saved = { id: db.nextId++, reflection: '', ...session, created_at: new Date().toISOString() };
    db.sessions.push(saved);
    write(db);
    return saved;
  },

  async reflect(id, reflection) {
    const db = read();
    const session = db.sessions.find((s) => s.id === id);
    if (!session) throw new Error('not found');
    session.reflection = reflection.trim().slice(0, 280);
    write(db);
    return session;
  },

  async clearSessions() {
    write({ ...read(), sessions: [] });
    return null;
  },

  async stats(today = localDay()) {
    const days = new Map(); // day -> { seconds, sessions, completed }
    for (const s of read().sessions) {
      const d = days.get(s.day) ?? { seconds: 0, sessions: 0, completed: 0 };
      d.seconds += s.focused;
      d.sessions += 1;
      d.completed += s.completed ? 1 : 0;
      days.set(s.day, d);
    }
    const minutes = Object.fromEntries([...days].map(([day, d]) => [day, Math.floor(d.seconds / 60)]));
    const [streak, best] = streaks(new Set(days.keys()), today);
    const cutoff = shift(today, -HEATMAP_DAYS);
    const total = (field) => [...days.values()].reduce((sum, d) => sum + d[field], 0);

    return {
      today: { minutes: minutes[today] ?? 0, sessions: days.get(today)?.sessions ?? 0 },
      streak,
      best_streak: best,
      total: {
        minutes: Object.values(minutes).reduce((sum, m) => sum + m, 0),
        sessions: total('sessions'),
        completed: total('completed'),
      },
      heatmap: Object.fromEntries(Object.entries(minutes).filter(([day]) => day > cutoff)),
    };
  },
};
