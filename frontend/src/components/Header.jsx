import { ICONS } from '../sprites';
import { Sprite } from './Sprite';

const TABS = [
  ['focus', 'Brew'],
  ['progress', 'Progress'],
];

export function Header({ tab, onTab, onSettings }) {
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-icon" aria-hidden="true">☕</span>
        <span className="logo-text">Brew Focus</span>
      </div>
      <nav className="tabs" aria-label="Views">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            className="tab px"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <button className="icon-btn settings-btn px" onClick={onSettings} aria-label="Settings">
        <Sprite rows={ICONS.gear} />
      </button>
    </header>
  );
}
