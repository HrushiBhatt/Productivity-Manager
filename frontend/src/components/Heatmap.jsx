import { useLayoutEffect, useRef } from 'react';
import { formatMinutes, localDay, plural } from '../time';

const CELL = 11;
const STEP = CELL + 3;
const LEFT = 30;
const TOP = 18;
const WEEKS = 53;
const DAY_LABELS = { 1: 'Mon', 3: 'Wed', 5: 'Fri' };

const level = (min) => (min <= 0 ? 0 : min < 25 ? 1 : min < 60 ? 2 : min < 120 ? 3 : 4);
const LEGEND = ['No focus', 'Under 25m', '25–59m', '1–2h', '2h+'];

/** GitHub-style consistency grid: one column per week, one cell per day, shaded by minutes focused. */
export function Heatmap({ minutesByDay }) {
  const scroller = useRef(null);
  useLayoutEffect(() => {
    scroller.current.scrollLeft = scroller.current.scrollWidth; // show the most recent weeks on narrow screens
  }, []);

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (WEEKS - 1) * 7 - today.getDay());

  const cells = [];
  const months = [];
  for (let d = new Date(start), i = 0; d <= today; d.setDate(d.getDate() + 1), i++) {
    const col = Math.floor(i / 7);
    const row = i % 7;
    const key = localDay(d);
    if (row === 0 && d.getDate() <= 7) months.push({ col, label: d.toLocaleString(undefined, { month: 'short' }) });
    const min = minutesByDay[key] ?? 0;
    const when = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    cells.push({ key, col, row, min, label: `${when}: ${min ? formatMinutes(min) : 'no focus'}` });
  }

  const active = cells.filter((c) => c.min > 0);
  const total = active.reduce((sum, c) => sum + c.min, 0);

  return (
    <>
      <div className="heatmap-scroll" ref={scroller}>
        <svg
          className="heatmap"
          width={LEFT + WEEKS * STEP}
          height={TOP + 7 * STEP}
          role="img"
          aria-label={`${plural(active.length, 'active day')} in the last year`}
        >
          {months.map(({ col, label }) => (
            <text key={`${label}${col}`} x={LEFT + col * STEP} y={10}>
              {label}
            </text>
          ))}
          {Object.entries(DAY_LABELS).map(([row, label]) => (
            <text key={label} x={0} y={TOP + row * STEP + CELL - 2}>
              {label}
            </text>
          ))}
          {cells.map((c) => (
            <rect
              key={c.key}
              className={`heat-${level(c.min)}`}
              x={LEFT + c.col * STEP}
              y={TOP + c.row * STEP}
              width={CELL}
              height={CELL}
            >
              <title>{c.label}</title>
            </rect>
          ))}
        </svg>
      </div>
      <div className="heat-footer">
        <span>
          {plural(active.length, 'active day')} · {formatMinutes(total)} this year
        </span>
        <span className="heat-legend" aria-hidden="true">
          Less
          {LEGEND.map((label, i) => (
            <span key={label} className={`swatch heat-${i}`} title={label} />
          ))}
          More
        </span>
      </div>
    </>
  );
}
