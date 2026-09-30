import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { api } from './api';
import { audio, chime, tick } from './audio';
import { AmbienceMixer } from './components/AmbienceMixer';
import { BreathingModal, IntentionModal, ReflectionModal } from './components/FlowModals';
import { Header } from './components/Header';
import { ModePicker } from './components/ModePicker';
import { ProgressView } from './components/ProgressView';
import { SettingsModal } from './components/SettingsModal';
import { TimerStage } from './components/TimerStage';
import { Toast, useToast } from './components/Toast';
import { useLiveTab } from './hooks/useLiveTab';
import { useLocalState } from './hooks/useLocalState';
import { useTimer } from './hooks/useTimer';
import { BUILTIN_MODES, fromPreset } from './modes';
import { CAFE } from './sprites';
import { localDay } from './time';

const DEFAULT_SETTINGS = { sound: true, notify: false, autoBreak: true, strict: false, breathe: true, tick: 'off' };

function notify(body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Brew Focus', { body, icon: '/favicon.svg' });
  }
}

export default function App() {
  const [settings, setSettings] = useLocalState('brew:settings', DEFAULT_SETTINGS);
  const [modeKey, setModeKey] = useLocalState('brew:mode', BUILTIN_MODES[0].key);
  const [customModes, setCustomModes] = useState([]);
  const [tab, setTab] = useState('focus');
  const [phase, setPhase] = useState('focus'); // focus | break
  const [intention, setIntention] = useState('');
  const [dialog, setDialog] = useState(null); // intention | breathe | reflect | settings
  const [logged, setLogged] = useState(null); // session awaiting a reflection
  const [stats, setStats] = useState(null); // null = loading, false = API unreachable
  const [toast, showToast] = useToast();
  const distractions = useRef(0);

  const modes = [...BUILTIN_MODES, ...customModes];
  const mode = modes.find((m) => m.key === modeKey) ?? BUILTIN_MODES[0];
  const timer = useTimer(mode.focus * 60, handleFinish);
  const progress = timer.duration ? 1 - timer.remaining / timer.duration : 0;
  const fill = phase === 'focus' ? 1 - progress : progress; // coffee drains while focusing, refills on break
  const midSession = timer.status !== 'idle' || phase === 'break';

  useLiveTab(timer, phase, fill);

  // ---- data -------------------------------------------------------------

  /** Reload stats; returns a café item if this refresh crossed its unlock threshold. */
  async function refreshStats() {
    try {
      const next = await api.stats();
      const before = stats ? stats.total.completed : next.total.completed;
      setStats(next);
      return CAFE.find((item) => before < item.at && next.total.completed >= item.at);
    } catch {
      setStats((s) => s || false);
      return undefined;
    }
  }

  useEffect(() => {
    api.presets().then(
      (presets) => setCustomModes(presets.map(fromPreset)),
      () => showToast("Can't reach the Brew Focus API, so sessions won't be saved."),
    );
    refreshStats();
  }, []);

  // Load the selected mode's focus length when it changes (including once custom modes arrive).
  const loadMode = useEffectEvent(() => {
    if (!midSession) timer.load(mode.focus * 60);
  });
  useEffect(() => loadMode(), [mode.key, mode.focus]);

  async function createMode(values) {
    const created = fromPreset(await api.createPreset(values));
    setCustomModes((list) => [...list, created]);
    setModeKey(created.key);
    showToast(`Saved “${created.name}”`);
  }

  async function deleteMode(m) {
    try {
      await api.deletePreset(m.id);
    } catch (err) {
      return showToast(err.message);
    }
    setCustomModes((list) => list.filter((x) => x.key !== m.key));
    if (m.key === modeKey) setModeKey(BUILTIN_MODES[0].key);
  }

  // ---- session flow: intention → (breathe) → focus → reflect → break ----

  function primary() {
    audio(); // unlock Web Audio inside a user gesture so later chimes can play
    if (timer.status === 'running') timer.pause();
    else if (timer.status === 'paused' || phase === 'break') timer.start();
    else setDialog('intention');
  }

  function beginFocus(goal, breathe) {
    setIntention(goal);
    setSettings((s) => ({ ...s, breathe }));
    distractions.current = 0;
    if (breathe) {
      setDialog('breathe');
    } else {
      setDialog(null);
      timer.start();
    }
  }

  function startBreak() {
    if (!mode.rest) return backToFocus();
    setPhase('break');
    timer.load(mode.rest * 60, settings.autoBreak);
  }

  function backToFocus() {
    setPhase('focus');
    setIntention('');
    timer.load(mode.focus * 60);
  }

  function reset() {
    if (phase === 'break') backToFocus();
    else timer.load(mode.focus * 60); // keeps the intention so a restart can reuse it
  }

  function skip() {
    if (midSession) timer.skip();
  }

  async function handleFinish({ completed, elapsed }) {
    if (completed && settings.sound) chime(phase);
    if (completed && settings.notify && document.hidden) {
      notify(phase === 'focus' ? 'Brew complete. Time for a break ☕' : 'Break over. Ready for another brew?');
    }
    if (phase === 'break') return backToFocus();
    if (elapsed < 60) {
      showToast('Under a minute, so not logged.');
      return backToFocus();
    }

    try {
      const session = await api.logSession({
        mode: mode.name,
        planned: timer.duration,
        focused: elapsed,
        completed,
        intention,
        distractions: distractions.current,
        day: localDay(),
      });
      setLogged({ ...session, unlocked: await refreshStats() });
      setDialog('reflect');
    } catch (err) {
      showToast(`Couldn't save this session: ${err.message}`);
      startBreak();
    }
  }

  function finishReflection(note) {
    if (note) api.reflect(logged.id, note).catch((err) => showToast(err.message));
    setDialog(null);
    setLogged(null);
    startBreak();
  }

  // ---- audio pressure, strict mode, keyboard -----------------------------

  const second = Math.ceil(timer.remaining);
  const playTick = useEffectEvent(() => {
    if (timer.status === 'running' && phase === 'focus' && settings.tick !== 'off') {
      tick(settings.tick, second, second <= 60);
    }
  });
  useEffect(() => playTick(), [second]);

  const strict = settings.strict && phase === 'focus' && timer.status === 'running';
  const onTabSwitch = useEffectEvent(() => {
    if (document.hidden) distractions.current += 1;
    else showToast(`Welcome back. Distraction #${distractions.current} logged.`);
  });
  useEffect(() => {
    if (!strict) return undefined;
    const onVisibility = () => onTabSwitch();
    const onLeave = (e) => e.preventDefault(); // browser shows "Leave site?"
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [strict]);

  const onKey = useEffectEvent((e) => {
    if (dialog || tab !== 'focus' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, button, summary')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      primary();
    } else if (e.key === 'r') reset();
    else if (e.key === 's') skip();
  });
  useEffect(() => {
    const handler = (e) => onKey(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function updateSettings(next) {
    setSettings(next);
    if (next.notify && !settings.notify && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then((permission) => {
        if (permission !== 'granted') {
          setSettings((s) => ({ ...s, notify: false }));
          showToast('Notifications are blocked for this site in your browser.');
        }
      });
    }
  }

  async function clearData() {
    if (!window.confirm('Delete every logged session? Custom modes are kept.')) return;
    try {
      await api.clearSessions();
      await refreshStats();
      showToast('All sessions deleted.');
    } catch (err) {
      showToast(err.message);
    }
  }

  // ---- render -------------------------------------------------------------

  return (
    <div className="app">
      <Header
        tab={tab}
        onTab={(next) => {
          setTab(next);
          if (next === 'progress') refreshStats();
        }}
        onSettings={() => setDialog('settings')}
      />

      <main className="focus-view" hidden={tab !== 'focus'}>
        <TimerStage
          timer={timer}
          phase={phase}
          mode={mode}
          progress={progress}
          fill={fill}
          intention={intention}
          stats={stats}
          onPrimary={primary}
          onReset={reset}
          onSkip={skip}
        />
        <ModePicker
          modes={modes}
          active={mode}
          disabled={midSession}
          onSelect={(m) => setModeKey(m.key)}
          onCreate={createMode}
          onDelete={deleteMode}
        />
        <AmbienceMixer tick={settings.tick} onTickChange={(style) => setSettings((s) => ({ ...s, tick: style }))} />
      </main>

      {tab === 'progress' && <ProgressView stats={stats} />}

      {dialog === 'intention' && (
        <IntentionModal
          mode={mode}
          initialGoal={intention}
          initialBreathe={settings.breathe}
          onStart={beginFocus}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'breathe' && (
        <BreathingModal
          onDone={() => {
            setDialog(null);
            timer.start();
          }}
        />
      )}
      {dialog === 'reflect' && logged && <ReflectionModal session={logged} onDone={finishReflection} />}
      {dialog === 'settings' && (
        <SettingsModal
          settings={settings}
          onChange={updateSettings}
          onClearData={clearData}
          onClose={() => setDialog(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
