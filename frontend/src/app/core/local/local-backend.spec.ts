import { TestBed } from '@angular/core/testing';
import { LiveEvent, Session, Stats, TimerState } from '../models';
import { LocalBackend } from './local-backend';

// The same scenarios as backend/internal/api/api_test.go, so both backends behave alike.

const TODAY = '2026-09-30';
const day = (offset: number) => {
  const d = new Date(2026, 8, 30 - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('LocalBackend (the Go API, in the browser)', () => {
  let api: LocalBackend;
  let events: LiveEvent[];
  const call = (method: string, url: string, body?: unknown) => api.handle(method, url, body);
  const focus = (extra: object = {}) =>
    call('POST', '/api/timer/focus', { mode: 'Pomodoro', planned: 1500, day: TODAY, ...extra });

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    api = TestBed.inject(LocalBackend);
    events = [];
    api.events$.subscribe((e) => events.push(e));
  });

  afterEach(() => vi.useRealTimers());

  it('validates like the server', () => {
    for (const body of [
      { name: ' ', focus: 25, rest: 5 },
      { name: 'x', focus: 0, rest: 5 },
      { name: 'x', focus: 25, rest: 61 },
      { name: 'x', focus: '25', rest: 5 },
      { name: 'x'.repeat(33), focus: 25, rest: 5 },
    ]) {
      const res = call('POST', '/api/presets', body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((res.body as { error: string }).error).toBeTruthy();
    }
    expect(call('POST', '/api/presets', { name: ' Thesis ', focus: 75, rest: 0 })).toEqual({
      status: 201,
      body: { id: 1, name: 'Thesis', focus: 75, rest: 0 },
    });
    expect(call('GET', '/api/nope').status).toBe(404);
    expect(call('DELETE', '/api/presets/99').status).toBe(404);
  });

  it('runs one timer at a time, with pause, resume and cancel', () => {
    const task = call('POST', '/api/tasks', { title: 'Write chapter 2' }).body as { id: number };
    const started = focus({ task_id: task.id }).body as TimerState;
    expect(started).toMatchObject({ status: 'running', intention: 'Write chapter 2' });
    expect(call('POST', '/api/timer/break', { length: 300 }).status).toBe(409);

    expect((call('POST', '/api/timer/pause').body as TimerState).status).toBe('paused');
    vi.advanceTimersByTime(2 * 60 * 60_000); // a paused timer never expires
    expect((call('GET', '/api/timer').body as TimerState).status).toBe('paused');
    expect(call('POST', '/api/timer/pause').status).toBe(409);
    expect((call('POST', '/api/timer/resume').body as TimerState).status).toBe('running');

    expect((call('POST', '/api/timer/cancel').body as TimerState).status).toBe('idle');
    expect(call('GET', '/api/sessions').body).toEqual([]);
    expect(call('POST', '/api/timer/pause').status).toBe(409);
    expect(call('POST', '/api/timer/explode').status).toBe(404);
  });

  it('completes a block on its deadline, logs it and unlocks the café', () => {
    focus({ intention: 'Ship it' });
    call('POST', '/api/timer/distraction');
    vi.advanceTimersByTime(1500 * 1000);

    const done = events.find((e) => e.type === 'session.completed');
    expect(done?.data).toMatchObject({ unlocked: 'sprout', session: { completed: true, focused: 1500, distractions: 1 } });
    expect((call('GET', '/api/timer').body as TimerState).status).toBe('idle');
    expect(events.map((e) => e.type)).toContain('timer');
  });

  it('discards a block finished in under a minute', () => {
    focus();
    vi.advanceTimersByTime(30_000);
    call('POST', '/api/timer/finish');
    expect(events.at(-1)?.type).toBe('session.discarded');
    expect(call('GET', '/api/sessions').body).toEqual([]);
  });

  it('finishes a block whose deadline passed while no tab was open', () => {
    focus();
    vi.setSystemTime(Date.now() + 2 * 60 * 60_000); // the browser was closed for two hours
    TestBed.resetTestingModule();
    const reopened = TestBed.inject(LocalBackend); // a fresh page load
    vi.runOnlyPendingTimers();
    const [session] = reopened.handle('GET', '/api/sessions', null).body as Session[];
    expect(session).toMatchObject({ completed: true, focused: 1500 });
  });

  it('counts brews and minutes per task', () => {
    const task = call('POST', '/api/tasks', { title: 'Write chapter 2', estimate: 4 }).body as { id: number };
    focus({ task_id: task.id });
    vi.advanceTimersByTime(1500 * 1000);
    const [listed] = call('GET', '/api/tasks').body as { brews: number; minutes: number; estimate: number }[];
    expect(listed).toMatchObject({ brews: 1, minutes: 25, estimate: 4 });
  });

  it('computes streaks and the heatmap like the server', () => {
    for (const offset of [0, 1, 3, 4, 5, 400]) {
      vi.setSystemTime(new Date(2026, 8, 30 - offset, 9));
      focus({ day: day(offset) });
      vi.advanceTimersByTime(1500 * 1000);
    }
    vi.setSystemTime(new Date(2026, 8, 30, 12));
    focus();
    vi.advanceTimersByTime(600_000);
    call('POST', '/api/timer/finish');

    const stats = call('GET', `/api/stats?today=${TODAY}`).body as Stats;
    expect(stats.today).toEqual({ minutes: 35, sessions: 2 });
    expect([stats.streak, stats.best_streak]).toEqual([2, 3]);
    expect(stats.total).toEqual({ minutes: 160, sessions: 7, completed: 6 });
    expect(stats.heatmap[day(400)]).toBeUndefined();
    expect(stats.heatmap[day(3)]).toBe(25);
    expect((call('GET', `/api/stats?today=${day(-2)}`).body as Stats).streak).toBe(0);
  });

  it('saves reflections and tells other tabs', () => {
    focus();
    vi.advanceTimersByTime(1500 * 1000);
    const [session] = call('GET', '/api/sessions').body as Session[];
    call('PATCH', `/api/sessions/${session.id}`, { reflection: '  Drafted the intro. ' });
    expect((call('GET', '/api/sessions').body as Session[])[0].reflection).toBe('Drafted the intro.');
    expect(events.at(-1)).toEqual({ type: 'session.reflected', data: { id: session.id } });
    expect(call('PUT', '/api/me/settings', { tick: 'loud' }).status).toBe(400);
  });
});
