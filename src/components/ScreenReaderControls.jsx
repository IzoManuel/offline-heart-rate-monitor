import React, { useEffect, useRef, useState } from 'react';
import { speakText, speechDiagnostics, speechSupported, speechVoiceCount } from '../utils/speech';
import { fileToDataUrl, playSound, saveCustomSound } from '../utils/audioFeedback';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic } from '@fortawesome/free-solid-svg-icons';

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
  const [status, setStatus] = useState('');
  const [diagnostics, setDiagnostics] = useState(() => speechDiagnostics(window));
  const [mode, setMode] = useState(() => globalThis.localStorage?.getItem('offline-hr-reader-mode') || 'sound');
  const [soundRepeat, setSoundRepeat] = useState(() => globalThis.localStorage?.getItem('offline-hr-sound-repeat') || 'repeat');
  const [customSoundName, setCustomSoundName] = useState('No file selected');
  const snapshotRef = useRef(snapshot);
  const selectedRef = useRef(selected);
  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => {
    if (!speechSupported(window)) return undefined;
    const refresh = () => setDiagnostics(speechDiagnostics(window));
    refresh();
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
  }, []);

  useEffect(() => { globalThis.localStorage?.setItem('offline-hr-screen-reader', String(enabled)); }, [enabled]);
  useEffect(() => { globalThis.localStorage?.setItem('offline-hr-screen-reader-interval', String(intervalSeconds)); }, [intervalSeconds]);
  useEffect(() => { globalThis.localStorage?.setItem('offline-hr-screen-reader-metrics', JSON.stringify(selected)); }, [selected]);
  useEffect(() => {
    if (!enabled || disabled || !speechSupported(window)) return undefined;
    const read = () => {
      const currentSnapshot = snapshotRef.current;
      const available = OPTIONS.filter(option => selectedRef.current.includes(option.key) && Number.isFinite(currentSnapshot?.[option.key]));
      if (!available.length) return;
      const text = available.map(option => `${option.label}, ${option.key === 'heartRate' ? Math.round(currentSnapshot[option.key]) : currentSnapshot[option.key].toFixed(1)} ${option.unit}`).join('. ');
      if (mode !== 'voice') playSound('announcement', window);
      if (mode !== 'sound') speakText(text, window);
    };
    read();
    if (mode === 'sound' && soundRepeat === 'once') return undefined;
    const timer = window.setInterval(read, intervalSeconds * 1000);
    return () => { window.clearInterval(timer); window.speechSynthesis.cancel(); };
  }, [enabled, disabled, intervalSeconds, mode, soundRepeat]);

  const testVoice = () => {
    const currentSnapshot = snapshotRef.current;
    const available = OPTIONS.filter(option => selectedRef.current.includes(option.key) && Number.isFinite(currentSnapshot?.[option.key]));
    const text = available.length
      ? available.map(option => `${option.label}, ${option.key === 'heartRate' ? Math.round(currentSnapshot[option.key]) : currentSnapshot[option.key].toFixed(1)} ${option.unit}`).join('. ')
      : 'Voice reader is ready.';
    const callbacks = { onstart: () => { setDiagnostics(speechDiagnostics(window)); setStatus('Voice playback started.'); }, onend: () => { setDiagnostics(speechDiagnostics(window)); setStatus('Voice playback finished.'); }, onerror: event => { setDiagnostics(speechDiagnostics(window)); setStatus(`Voice playback error: ${event.error || 'unknown error'}.`); } };
    if (mode !== 'voice') playSound('announcement', window);
    if (mode !== 'sound' && speakText(text, window, callbacks)) { setDiagnostics(speechDiagnostics(window)); setStatus(speechVoiceCount(window) ? 'Voice test queued.' : 'Voice queued; no browser voices are currently available.'); console.info('[Voice Reader] Test requested', speechDiagnostics(window)); }
    else if (mode === 'sound') setStatus('Soft announcement sound played.');
    else setStatus('Speech playback is not supported by this browser.');
  };

  return (
    <section className="screen-reader-controls" aria-labelledby="screen-reader-heading">
      <h2 id="screen-reader-heading">Screen Reader</h2>
      <p>Optionally read available metrics aloud while this page is open.</p>
      <label className="trend-switch"><input type="checkbox" checked={enabled} disabled={disabled || !speechSupported(window)} onChange={event => setEnabled(event.target.checked)} /><span>Read Metrics Aloud</span></label>
      {!speechSupported(window) && <p role="status">Speech playback is not supported by this browser.</p>}
      <div className="reader-actions"><button type="button" className="form-action" disabled={disabled} onClick={testVoice}>{mode === 'sound' ? 'Test Sound' : 'Test Reader'}</button>{status && <span role="status">{status}</span>}</div>
      <label className="form-field"><span>Announcement Mode</span><select value={mode} onChange={event => { setMode(event.target.value); globalThis.localStorage?.setItem('offline-hr-reader-mode', event.target.value); }}><option value="sound">Soft Sound</option><option value="voice">Voice</option><option value="both">Voice And Soft Sound</option></select></label>
      {mode !== 'voice' && <label className="form-field"><span>Sound Playback</span><select value={soundRepeat} onChange={event => { setSoundRepeat(event.target.value); globalThis.localStorage?.setItem('offline-hr-sound-repeat', event.target.value); }}><option value="repeat">Repeat At Interval</option><option value="once">Play Once</option></select></label>}
      <div className="audio-upload"><span className="audio-upload-label">Custom Announcement Sound</span><div className="audio-file-control"><input id="custom-announcement-sound" type="file" accept="audio/*" onChange={async event => { const file = event.target.files?.[0]; if (file && file.size <= 1000000) { saveCustomSound('announcement', await fileToDataUrl(file)); setCustomSoundName(file.name); setStatus('Custom announcement sound saved.'); } }} /><label htmlFor="custom-announcement-sound" className="audio-file-button"><FontAwesomeIcon icon={faMusic} aria-hidden="true" /> Choose Audio</label><span className="audio-file-name" title={customSoundName}>{customSoundName}</span></div></div>
      {speechSupported(window) && <details className="voice-diagnostics"><summary>Voice Diagnostics</summary><dl><div><dt>Available Voices</dt><dd>{diagnostics.voices}</dd></div><div><dt>Queue</dt><dd>{diagnostics.speaking ? 'Speaking' : diagnostics.pending ? 'Pending' : diagnostics.paused ? 'Paused' : 'Idle'}</dd></div>{diagnostics.voiceNames.length > 0 && <div><dt>Voices</dt><dd>{diagnostics.voiceNames.join(', ')}</dd></div>}</dl></details>}
      <div className="reader-settings">
        <label className="form-field"><span>Reading Interval</span><select value={intervalSeconds} disabled={!enabled} onChange={event => setIntervalSeconds(Number(event.target.value))}><option value="2">2 Seconds</option><option value="5">5 Seconds</option><option value="10">10 Seconds</option><option value="30">30 Seconds</option><option value="60">1 Minute</option></select></label>
        <fieldset className="metric-checkboxes" disabled={!enabled}><legend>Metrics To Read</legend>{OPTIONS.map(option => <label key={option.key}><input type="checkbox" checked={selected.includes(option.key)} onChange={event => setSelected(previous => event.target.checked ? [...previous, option.key] : previous.filter(key => key !== option.key))} /> <span>{option.label}</span></label>)}</fieldset>
      </div>
    </section>
  );
}

export default ScreenReaderControls;
