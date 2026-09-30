import { useEffect, useEffectEvent, useState } from 'react';
import { formatMinutes } from '../time';
import { Modal } from './Modal';
import { Sprite } from './Sprite';

export function IntentionModal({ mode, initialGoal, initialBreathe, onStart, onClose }) {
  const [goal, setGoal] = useState(initialGoal);
  const [breathe, setBreathe] = useState(initialBreathe);

  return (
    <Modal title="Set an intention" onClose={onClose}>
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onStart(goal.trim(), breathe);
        }}
      >
        <label className="field">
          What's the one thing this {mode.focus}-minute brew is for?
          <input
            className="input px"
            data-autofocus
            maxLength={140}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Draft the intro section"
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={breathe} onChange={(e) => setBreathe(e.target.checked)} />
          Two rounds of box breathing first (~30s)
        </label>
        <div className="modal-actions">
          <button className="btn btn-primary px">{goal.trim() ? 'Start brewing' : 'Start without one'}</button>
        </div>
      </form>
    </Modal>
  );
}

const BREATH_STEPS = ['Breathe in', 'Hold', 'Breathe out', 'Hold'];
const ROUNDS = 2;

/** Box breathing (4-4-4-4) to transition into deep work. The dot traces the box in sync. */
export function BreathingModal({ onDone }) {
  const [elapsed, setElapsed] = useState(0);
  const done = useEffectEvent(onDone);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (elapsed >= ROUNDS * 16) done();
  }, [elapsed]);

  return (
    <Modal title="Breathe" onClose={onDone}>
      <div className="breath">
        <div className="breath-box">
          <div className="breath-fill" />
          <span className="breath-dot" />
        </div>
        <p className="breath-cue">{BREATH_STEPS[Math.floor(elapsed / 4) % 4]}</p>
        <p className="breath-count">{4 - (elapsed % 4)}</p>
      </div>
      <div className="modal-actions">
        <button className="btn px" onClick={onDone}>
          Skip to focus
        </button>
      </div>
    </Modal>
  );
}

export function ReflectionModal({ session, onDone }) {
  const [note, setNote] = useState('');
  const minutes = Math.round(session.focused / 60);

  return (
    <Modal title={session.completed ? 'Brew complete!' : 'Brew ended early'} onClose={() => onDone('')}>
      <p className="reflect-summary">
        You focused for <b>{formatMinutes(minutes)}</b>
        {session.intention && (
          <>
            {' '}on <q>{session.intention}</q>
          </>
        )}
        .
      </p>
      {session.unlocked && (
        <div className="unlock px">
          <Sprite rows={session.unlocked.rows} palette={session.unlocked.palette} className="unlock-sprite" />
          <p>
            New for your café: <b>{session.unlocked.name}</b>
          </p>
        </div>
      )}
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onDone(note.trim());
        }}
      >
        <label className="field">
          In one sentence, what did you get done?
          <textarea
            className="input px"
            data-autofocus
            rows={2}
            maxLength={280}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form.requestSubmit();
              }
            }}
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn px" onClick={() => onDone('')}>
            Skip
          </button>
          <button className="btn btn-primary px">Save to journal</button>
        </div>
      </form>
    </Modal>
  );
}
