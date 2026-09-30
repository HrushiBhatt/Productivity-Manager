import { BROWSER_ONLY } from '../api';
import { Modal } from './Modal';

const TOGGLES = [
  ['sound', 'Sound effects', '8-bit chime when a focus block or break ends.'],
  ['notify', 'Notifications', 'Ping me when time is up and this tab is in the background.'],
  ['autoBreak', 'Auto-start breaks', 'Begin the break as soon as you finish your reflection.'],
  ['strict', 'Strict mode', 'Warn before closing the tab mid-brew, and log every tab switch as a distraction.'],
];

export function SettingsModal({ settings, onChange, onClearData, onClose }) {
  return (
    <Modal title="Settings" onClose={onClose}>
      {TOGGLES.map(([key, label, hint]) => (
        <label className="setting" key={key}>
          <span className="setting-label">{label}</span>
          <span className="setting-hint">{hint}</span>
          <input
            type="checkbox"
            className="switch"
            checked={settings[key]}
            onChange={() => onChange({ ...settings, [key]: !settings[key] })}
          />
        </label>
      ))}
      <p className="shortcuts">
        <kbd>Space</kbd> start / pause · <kbd>R</kbd> reset · <kbd>S</kbd> finish or skip
      </p>
      {BROWSER_ONLY && <p className="setting-hint">This version saves your sessions and modes in this browser only.</p>}
      <button className="btn btn-danger px" onClick={onClearData}>
        Delete all sessions
      </button>
    </Modal>
  );
}
