import { useEffect } from 'react';
import { formatClock } from '../time';

/** Draw a 16×16 pixel mug whose coffee level (0–10 rows) mirrors the timer. */
function mugIcon(level) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const g = canvas.getContext('2d');
  g.scale(2, 2);
  const px = (color, x, y, w, h) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  px('#2A2A2A', 1, 3, 12, 12); // outline
  px('#FFFFFF', 2, 4, 10, 10); // cup
  if (level > 0) {
    px('#6F4E37', 2, 14 - level, 10, level); // coffee
    px('#A67C52', 2, 14 - level, 10, 1); // surface
  }
  px('#2A2A2A', 13, 5, 3, 7); // handle
  g.clearRect(13, 7, 1, 3);
  return canvas.toDataURL();
}

/**
 * The web's answer to a lock-screen widget: the tab title counts down and
 * the favicon's coffee drains, so the timer is readable from any tab.
 */
export function useLiveTab({ remaining, status }, phase, fill) {
  const title =
    status === 'idle' ? 'Brew Focus' : `${formatClock(remaining)} · ${phase === 'focus' ? 'Focus' : 'Break'}`;
  useEffect(() => {
    document.title = title;
  }, [title]);

  const level = Math.round(fill * 10);
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = mugIcon(level);
  }, [level]);
}
