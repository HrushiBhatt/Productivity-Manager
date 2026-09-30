import { useState } from 'react';
import { ICONS } from '../sprites';
import { Sprite } from './Sprite';

function CustomModeForm({ onCreate }) {
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await onCreate({ name: data.get('name'), focus: Number(data.get('focus')), rest: Number(data.get('rest')) });
      form.reset();
      form.closest('details').open = false;
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <details className="custom">
      <summary>Custom brew</summary>
      <form className="custom-form" onSubmit={submit}>
        <label className="field wide">
          Name
          <input className="input px" name="name" maxLength={32} required placeholder="e.g. Thesis sprint" />
        </label>
        <label className="field">
          Focus (min)
          <input className="input px" name="focus" type="number" min={1} max={180} defaultValue={45} required />
        </label>
        <label className="field">
          Break (min)
          <input className="input px" name="rest" type="number" min={0} max={60} defaultValue={10} required />
        </label>
        {error && <p className="form-error wide">{error}</p>}
        <button className="btn btn-primary px wide">Save mode</button>
      </form>
    </details>
  );
}

export function ModePicker({ modes, active, disabled, onSelect, onCreate, onDelete }) {
  return (
    <section className="panel modes px" aria-labelledby="modes-title">
      <h2 className="panel-title" id="modes-title">
        Brew mode
      </h2>
      <ul className="mode-list">
        {modes.map((m) => (
          <li key={m.key} className="mode-item">
            <button className="mode px" aria-pressed={m.key === active.key} disabled={disabled} onClick={() => onSelect(m)}>
              <span className="mode-time">
                {m.focus}
                <small>/{m.rest}</small>
              </span>
              <span className="mode-name">{m.name}</span>
              <span className="mode-blurb">{m.blurb}</span>
            </button>
            {m.custom && (
              <button className="mode-delete" aria-label={`Delete ${m.name}`} disabled={disabled} onClick={() => onDelete(m)}>
                <Sprite rows={ICONS.close} className="icon-sm" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {disabled && <p className="panel-note">Modes unlock when this brew ends.</p>}
      <CustomModeForm onCreate={onCreate} />
    </section>
  );
}
