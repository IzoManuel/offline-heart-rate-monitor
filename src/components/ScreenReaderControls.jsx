import React, { useEffect, useRef, useState } from 'react';

const OPTIONS = [
  { key: 'ddfaAlpha10', label: 'DDFA Alpha10', unit: '' },
  { key: 'rmssd', label: 'RMSSD', unit: 'milliseconds' },
  { key: 'sdnn', label: 'SDNN', unit: 'milliseconds' },
  { key: 'heartRate', label: 'Heart Rate', unit: 'BPM' },
  { key: 'brpm', label: 'BRPM', unit: 'breaths per minute' }
];

function ScreenReaderControls({ snapshot, disabled = false }) {
  const [enabled, setEnabled] = useState(() => globalThis.localStorage?.getItem('offline-hr-screen-reader') === 'true');
  const [intervalSeconds, setIntervalSeconds] = useState(() => Number(globalThis.localStorage?.getItem('offline-hr-screen-reader-interval')) || 5);
  const [selected, setSelected] = useState(() => {
    try { return JSON.parse(globalThis.localStorage?.getItem('offline-hr-screen-reader-metrics')) || OPTIONS.map(option => option.key); } catch { return OPTIONS.map(option => option.key); }
  });
  const snapshotRef = useRef(snapshot);
  const selectedRef = useRef(selected);
  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => { globalThis.localStorage?.setItem('offline-hr-screen-reader', String(enabled)); }, [enabled]);
  useEffect(() => { globalThis.localStorage?.setItem('offline-hr-screen-reader-interval', String(intervalSeconds)); }, [intervalSeconds]);
  useEffect(() => { globalThis.localStorage?.setItem('offline-hr-screen-reader-metrics', JSON.stringify(selected)); }, [selected]);
  useEffect(() => {
    if (!enabled || disabled || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') return undefined;
    const read = () => {
      const currentSnapshot = snapshotRef.current;
      const available = OPTIONS.filter(option => selectedRef.current.includes(option.key) && Number.isFinite(currentSnapshot?.[option.key]));
      if (!available.length) return;
      const text = available.map(option => `${option.label}, ${option.key === 'heartRate' ? Math.round(currentSnapshot[option.key]) : currentSnapshot[option.key].toFixed(1)} ${option.unit}`).join('. ');
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(text));
    };
    read();
    const timer = window.setInterval(read, intervalSeconds * 1000);
    return () => { window.clearInterval(timer); window.speechSynthesis.cancel(); };
  }, [enabled, disabled, intervalSeconds]);

  return (
    <section className="screen-reader-controls" aria-labelledby="screen-reader-heading">
      <h2 id="screen-reader-heading">Screen Reader</h2>
      <p>Optionally read available metrics aloud while this page is open.</p>
      <label className="trend-switch"><input type="checkbox" checked={enabled} disabled={disabled || !('speechSynthesis' in window)} onChange={event => setEnabled(event.target.checked)} /><span>Read Metrics Aloud</span></label>
      {!('speechSynthesis' in window) && <p role="status">Speech playback is not supported by this browser.</p>}
      <div className="reader-settings">
        <label className="form-field"><span>Reading Interval</span><select value={intervalSeconds} disabled={!enabled} onChange={event => setIntervalSeconds(Number(event.target.value))}><option value="2">2 Seconds</option><option value="5">5 Seconds</option><option value="10">10 Seconds</option><option value="30">30 Seconds</option><option value="60">1 Minute</option></select></label>
        <fieldset className="metric-checkboxes" disabled={!enabled}><legend>Metrics To Read</legend>{OPTIONS.map(option => <label key={option.key}><input type="checkbox" checked={selected.includes(option.key)} onChange={event => setSelected(previous => event.target.checked ? [...previous, option.key] : previous.filter(key => key !== option.key))} /> <span>{option.label}</span></label>)}</fieldset>
      </div>
    </section>
  );
}

export default ScreenReaderControls;
