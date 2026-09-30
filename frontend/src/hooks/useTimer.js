import { useEffect, useEffectEvent, useRef, useState } from 'react';

/**
 * Countdown driven by a wall-clock deadline, so it stays accurate when a
 * background tab throttles timers. Completion uses a single setTimeout, which
 * browsers don't batch the way they batch repeating intervals.
 *
 * onFinish({ completed, elapsed }) fires when time runs out or on skip().
 */
export function useTimer(initialSeconds, onFinish) {
  const [timer, setTimer] = useState({
    duration: initialSeconds,
    remaining: initialSeconds,
    status: 'idle', // idle | running | paused
    run: 0, // bumps on load() so a new countdown always restarts the effect
  });
  const deadline = useRef(0);
  const left = () => Math.max(0, (deadline.current - Date.now()) / 1000);

  const finish = (completed, remaining) => {
    setTimer((t) => ({ ...t, status: 'idle', remaining }));
    onFinish({ completed, elapsed: Math.round(timer.duration - remaining) });
  };
  const complete = useEffectEvent(() => finish(true, 0));
  const startingFrom = useEffectEvent(() => timer.remaining);

  useEffect(() => {
    if (timer.status !== 'running') return undefined;
    const seconds = startingFrom();
    deadline.current = Date.now() + seconds * 1000;
    const tick = setInterval(() => setTimer((t) => ({ ...t, remaining: left() })), 250);
    const done = setTimeout(() => complete(), seconds * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [timer.status, timer.run]);

  return {
    ...timer,
    start: () => setTimer((t) => ({ ...t, status: 'running' })),
    pause: () => setTimer((t) => ({ ...t, status: 'paused', remaining: left() })),
    load: (seconds, autostart = false) =>
      setTimer((t) => ({
        duration: seconds,
        remaining: seconds,
        status: autostart ? 'running' : 'idle',
        run: t.run + 1,
      })),
    skip: () => finish(false, timer.status === 'running' ? left() : timer.remaining),
  };
}
