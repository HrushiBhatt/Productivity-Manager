import { localApi } from './localApi';
import { localDay } from './time';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

const serverApi = {
  presets: () => request('/presets'),
  createPreset: (preset) => request('/presets', { method: 'POST', body: preset }),
  deletePreset: (id) => request(`/presets/${id}`, { method: 'DELETE' }),
  sessions: (limit = 30) => request(`/sessions?limit=${limit}`),
  logSession: (session) => request('/sessions', { method: 'POST', body: session }),
  reflect: (id, reflection) => request(`/sessions/${id}`, { method: 'PATCH', body: { reflection } }),
  clearSessions: () => request('/sessions', { method: 'DELETE' }),
  stats: () => request(`/stats?today=${localDay()}`),
};

/** Static hosts like GitHub Pages have no server, so that build keeps data in the browser. */
export const BROWSER_ONLY = import.meta.env.VITE_STORAGE === 'browser';

export const api = BROWSER_ONLY ? localApi : serverApi;
