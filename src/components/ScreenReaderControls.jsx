import React, { useEffect, useMemo, useState } from 'react';

const OPTIONS = [
  { key: 'ddfaAlpha10', label: 'DDFA Alpha10', unit: '' },
  { key: 'rmssd', label: 'RMSSD', unit: 'milliseconds' },
  { key: 'sdnn', label: 'SDNN', unit: 'milliseconds' },
  { key: 'heartRate', label: 'Heart Rate', unit: 'BPM' },
  { key: 'brpm', label: 'BRPM', unit: 'breaths per minute' }
];

function ScreenReaderControls({ snapshot, disabled = false }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('offline-hr-screen-reader') === 'true');
  const [intervalSeconds, setIntervalSeconds] = useState(() => Number(localStorage.getItem('offline-hr-screen-reader-interval')) || 5);
  const [selected, setSelected] = useState(() => {
    try { return JSON.parse(localStorage.getItem('offline-hr-screen-reader-metrics')) || OPTIONS.map(option => option.key); } catch { return OPTIONS.map(option => option.key); }
  });
  const available = useMemo(() => OPTIONS.filter(option => selected.includes(option.key) && Number.isFinite(snapshot?.[option.key])), [selected, snapshot]);

  useEffect(() => { localStorage.setItem('offline-hr-screen-reader', String(enabled)); }, [enabled]);
  useEffect(() => { localStorage.setItem('offline-hr-screen-reader-interval', String(intervalSeconds)); }, [intervalSeconds]);
  useEffect(() => { localStorage.setItem('offline-hr-screen-reader-metrics', JSON.stringify(selected)); }, [selected]);
  useEffect(() => {
    if (!enabled || disabled || !available.length || !('speechSynthesis' in window)) return undefined;
    const read = () => {
      const text = available.map(option => `${option.label}, ${option.key === 'heartRate' ? Math.round(snapshot[option.key]) : snapshot[option.key].toFixed(1)} ${option.unit}`).join('. ');
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    };
    read();
    const timer = window.setInterval(read, intervalSeconds * 1000);
    return () => { window.clearInterval(timer); window.speechSynthesis.cancel(); };
  }, [enabled, disabled, intervalSeconds, available, snapshot]);

  return (
    <section className="screen-reader-controls" aria-labelledby="screen-reader-heading">
      <h2 id="screen-reader-heading">Screen Reader</h2>
      <p>Optionally read available metrics aloud while this page is open.</p>
      <label className="trend-switch"><input type="checkbox" checked={enabled} disabled={disabled || !('speechSynthesis' in window)} onChange={event => setEnabled(event.target.checked)} /><span>Read Metrics Aloud</span></label>
      {!('speechSynthesis' in window) && <p role="status">Speech playback is not supported by this browser.</p>}
      <label><span>Reading Interval</span><select value={intervalSeconds} disabled={!enabled} onChange={event => setIntervalSeconds(Number(event.target.value))}><option value="2">2 Seconds</option><option value="5">5 Seconds</option><option value="10">10 Seconds</option><option value="30">30 Seconds</option><option value="60">1 Minute</option></select></label>
      <fieldset disabled={!enabled}><legend>Metrics To Read</legend>{OPTIONS.map(option => <label key={option.key}><input type="checkbox" checked={selected.includes(option.key)} onChange={event => setSelected(previous => event.target.checked ? [...previous, option.key] : previous.filter(key => key !== option.key))} /> {option.label}</label>)}</fieldset>
    </section>
  );
}

export default ScreenReaderControls;
