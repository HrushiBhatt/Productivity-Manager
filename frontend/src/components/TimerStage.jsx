import { ICONS } from '../sprites';
import { formatClock, formatMinutes, plural } from '../time';
import { PixelMug } from './PixelMug';
import { Sprite } from './Sprite';

const SEGMENTS = 24;

function statusLabel({ status, remaining }, phase) {
  if (phase === 'focus' && status === 'idle' && remaining === 0) return 'NICE!';
  if (status === 'paused') return 'PAUSED';
  if (phase === 'break') return 'BREAK';
  return status === 'running' ? 'FOCUS!' : 'READY!';
}

export function TimerStage({ timer, phase, mode, progress, fill, intention, stats, onPrimary, onReset, onSkip }) {
  const running = timer.status === 'running';
  const [mm, ss] = formatClock(timer.remaining).split(':');
  const lit = Math.round(progress * SEGMENTS);

  return (
    <section className={`stage ${phase === 'break' ? 'is-break' : ''}`} aria-label="Timer">
      <p className="phase-chip px">
        {phase === 'focus' ? 'Focus' : 'Break'} · {mode.name} · {mode.focus}/{mode.rest}
      </p>

      <PixelMug fill={fill} running={running} celebrate={statusLabel(timer, phase) === 'NICE!'}>
        <div className="clock" role="timer" aria-live="off">
          {mm}
          <span className="clock-sep">:</span>
          {ss}
        </div>
        <div className="clock-label">{statusLabel(timer, phase)}</div>
      </PixelMug>

      <p className={`intention ${intention ? '' : 'is-empty'}`}>
        {phase === 'break'
          ? 'Step away from the screen. Stretch, sip, breathe.'
          : intention
            ? `🎯 ${intention}`
            : 'Press start to set an intention for this brew.'}
      </p>

      <div
        className="segments"
        role="progressbar"
        aria-label={`${phase} progress`}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={i < lit ? 'on' : ''} />
        ))}
      </div>

      <div className="controls">
        <button className="ctrl px" onClick={onReset} aria-label="Reset" title="Reset (R)">
          <Sprite rows={ICONS.reset} />
        </button>
        <button
          className="ctrl ctrl-play px"
          onClick={onPrimary}
          aria-label={running ? 'Pause' : 'Start'}
          title={running ? 'Pause (Space)' : 'Start (Space)'}
        >
          <Sprite rows={running ? ICONS.pause : ICONS.play} />
        </button>
        <button
          className="ctrl px"
          onClick={onSkip}
          disabled={phase === 'focus' && timer.status === 'idle'}
          aria-label={phase === 'focus' ? 'Finish early' : 'Skip break'}
          title={phase === 'focus' ? 'Finish early (S)' : 'Skip break (S)'}
        >
          <Sprite rows={ICONS.skip} />
        </button>
      </div>

      {stats && (
        <p className="today">
          <span>
            Today <b>{plural(stats.today.sessions, 'brew')}</b>
          </span>
          <span>
            <b>{formatMinutes(stats.today.minutes)}</b> focused
          </span>
          <span>
            🔥 <b>{plural(stats.streak, 'day')}</b>
          </span>
        </p>
      )}
    </section>
  );
}
