import { useEffect, useState } from 'react';
import { audio, loadCustomTrack, mix, tick as playTick } from '../audio';
import { useLocalState } from '../hooks/useLocalState';

const LAYERS = [
  { id: 'rain', label: 'Rain', icon: '🌧️' },
  { id: 'cafe', label: 'Café', icon: '☕' },
  { id: 'fire', label: 'Fireplace', icon: '🔥' },
  { id: 'lofi', label: 'Lo-fi keys', icon: '🎹' },
];

const TICKS = [
  ['off', 'Off'],
  ['clock', 'Clock'],
  ['ominous', 'Ominous'],
];

function Slider({ value, onChange, label, disabled }) {
  return (
    <input
      className="range"
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={value}
      disabled={disabled}
      aria-label={label}
      style={{ '--val': value }}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function AmbienceMixer({ tick, onTickChange }) {
  const [volumes, setVolumes] = useLocalState('brew:mix', { rain: 0.5, cafe: 0, fire: 0, lofi: 0.3, custom: 0 });
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState(null);
  const setVolume = (id) => (v) => setVolumes((vols) => ({ ...vols, [id]: v }));

  useEffect(() => {
    mix(volumes, playing);
  }, [volumes, playing]);

  function pickTrack(e) {
    const file = e.target.files[0];
    if (!file) return;
    loadCustomTrack(file);
    setTrack(file.name);
    setVolumes((vols) => ({ ...vols, custom: vols.custom || 0.6 }));
  }

  function chooseTick(style) {
    onTickChange(style);
    if (style !== 'off') playTick(style, 1, false); // preview
  }

  return (
    <section className="panel mixer px" aria-labelledby="mixer-title">
      <h2 className="panel-title" id="mixer-title">
        Ambience
        <button
          className={`btn btn-sm px ${playing ? 'btn-primary' : ''}`}
          aria-pressed={playing}
          onClick={() => {
            audio();
            setPlaying(!playing);
          }}
        >
          {playing ? '■ Stop' : '▶ Play'}
        </button>
      </h2>
      <p className="panel-note">Layers blend. Try rain under lo-fi keys.</p>

      <div className="layers">
        {LAYERS.map(({ id, label, icon }) => (
          <div className="layer" key={id}>
            <span aria-hidden="true">{icon}</span>
            <span className="layer-name">{label}</span>
            <Slider label={`${label} volume`} value={volumes[id]} onChange={setVolume(id)} />
          </div>
        ))}
        <div className="layer">
          <span aria-hidden="true">🎧</span>
          <label className="layer-name file-pick" title={track ?? 'Load an audio file from your computer'}>
            {track ?? 'Your audio…'}
            <input className="sr-only" type="file" accept="audio/*" onChange={pickTrack} />
          </label>
          <Slider label="Your audio volume" value={volumes.custom} onChange={setVolume('custom')} disabled={!track} />
        </div>
      </div>

      <h3 className="mixer-sub" id="tick-title">Ticking</h3>
      <div className="seg-group" role="radiogroup" aria-labelledby="tick-title">
        {TICKS.map(([id, label]) => (
          <button key={id} role="radio" aria-checked={tick === id} className="seg px" onClick={() => chooseTick(id)}>
            {label}
          </button>
        ))}
      </div>
      <p className="panel-note">Some people focus better with a little pressure. The final minute ticks louder.</p>
    </section>
  );
}
