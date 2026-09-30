import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatMinutes, plural } from '../time';
import { CafeShelf } from './CafeShelf';
import { Heatmap } from './Heatmap';

function Tile({ icon, label, value, sub }) {
  return (
    <div className="tile px">
      <span className="tile-label">
        <span aria-hidden="true">{icon}</span> {label}
      </span>
      <span className="tile-value">{value}</span>
      <span className="tile-sub">{sub}</span>
    </div>
  );
}

function Journal({ refreshKey }) {
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    api.sessions().then(setSessions, () => setSessions([]));
  }, [refreshKey]);

  if (!sessions) return <p className="empty">Loading…</p>;
  if (!sessions.length) return <p className="empty">No brews yet. Finished sessions and your reflections land here.</p>;

  return (
    <ol className="journal">
      {sessions.map((s) => (
        <li key={s.id} className={`entry ${s.completed ? '' : 'early'}`}>
          <div className="entry-meta">
            <time dateTime={s.created_at}>
              {new Date(s.created_at).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </time>
            <span>{s.mode}</span>
            <span className="entry-mins">{formatMinutes(Math.round(s.focused / 60))}</span>
            {!s.completed && <span>ended early</span>}
            {s.distractions > 0 && <span>{plural(s.distractions, 'distraction')}</span>}
          </div>
          {s.intention && <p>🎯 {s.intention}</p>}
          {s.reflection && <p className="entry-reflection">✎ {s.reflection}</p>}
        </li>
      ))}
    </ol>
  );
}

export function ProgressView({ stats }) {
  if (!stats) {
    return (
      <main className="progress-view">
        <p className="empty">
          {stats === null ? 'Loading your stats…' : "Couldn't load your stats. Is the API running on port 5001?"}
        </p>
      </main>
    );
  }

  const { today, streak, best_streak: best, total } = stats;
  return (
    <main className="progress-view">
      <div className="tiles">
        <Tile icon="☕" label="Today" value={formatMinutes(today.minutes)} sub={plural(today.sessions, 'brew')} />
        <Tile icon="🔥" label="Streak" value={plural(streak, 'day')} sub={`Best: ${plural(best, 'day')}`} />
        <Tile icon="⏱️" label="All time" value={formatMinutes(total.minutes)} sub={plural(total.sessions, 'session')} />
        <Tile icon="🏆" label="Full brews" value={total.completed} sub="ran all the way to 00:00" />
      </div>

      <section className="panel wide px" aria-labelledby="heat-title">
        <h2 className="panel-title" id="heat-title">
          Consistency
        </h2>
        <Heatmap minutesByDay={stats.heatmap} />
      </section>

      <section className="panel px" aria-labelledby="cafe-title">
        <h2 className="panel-title" id="cafe-title">
          Your café
        </h2>
        <CafeShelf completed={total.completed} />
      </section>

      <section className="panel px" aria-labelledby="journal-title">
        <h2 className="panel-title" id="journal-title">
          Brew journal
        </h2>
        <Journal refreshKey={stats} />
      </section>
    </main>
  );
}
