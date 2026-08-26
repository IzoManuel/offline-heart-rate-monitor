import React, { useEffect, useRef, useState } from 'react';
import { ALARM_INTERVALS, ALARM_METRICS, alarmValue, isAlarmSafe, isAlarmViolated, loadWebAlarms, saveWebAlarms } from '../utils/webAlarms';

function WebAlarmControls({ snapshot }) {
  const [alarms, setAlarms] = useState(() => loadWebAlarms());
  const [metric, setMetric] = useState('rmssd');
  const [condition, setCondition] = useState('below');
  const [threshold, setThreshold] = useState('10');
  const [repeatSeconds, setRepeatSeconds] = useState(5);
  const [permission, setPermission] = useState(() => 'Notification' in window ? Notification.permission : 'unsupported');
  const snapshotRef = useRef(snapshot);
  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);
  useEffect(() => { saveWebAlarms(alarms); }, [alarms]);
  useEffect(() => {
    if (!snapshotRef.current) return undefined;
    const timer = window.setInterval(() => {
      const now = Date.now();
      alarms.forEach(alarm => {
        const value = alarmValue(alarm, snapshotRef.current);
        if (isAlarmSafe(alarm, value) && (!alarm.acknowledged || alarm.lastTriggeredAt)) update(alarm.id, { acknowledged: false, lastTriggeredAt: null });
        if (!alarm.enabled || alarm.acknowledged || !isAlarmViolated(alarm, value)) return;
        if (alarm.lastTriggeredAt && now - alarm.lastTriggeredAt < alarm.repeatSeconds * 1000) return;
        const item = ALARM_METRICS.find(metricItem => metricItem.key === alarm.metric);
        const message = `Alert. ${item?.label} is ${alarm.condition} the limit. Current value ${value.toFixed(1)} ${item?.unit || 'unitless'}.`;
        if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(message)); }
        if (permission === 'granted') navigator.serviceWorker?.ready.then(registration => registration.showNotification('Heart Rate Monitor Alert', { body: message, tag: `metric-alert-${alarm.id}`, renotify: true }));
        update(alarm.id, { lastTriggeredAt: now });
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [Boolean(snapshot), alarms, permission]);
  const requestPermission = async () => { if ('Notification' in window) setPermission(await Notification.requestPermission()); };
  const addAlarm = () => { const value = Number(threshold); if (!Number.isFinite(value)) return; const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`; setAlarms(previous => [...previous, { id, metric, condition, threshold: value, repeatSeconds, enabled: true, lastTriggeredAt: null, acknowledged: false }]); };
  const update = (id, patch) => setAlarms(previous => previous.map(alarm => alarm.id === id ? { ...alarm, ...patch } : alarm));
  return <details className="web-alerts"><summary>Metric Alerts</summary><p>Optional threshold alerts while this page is open and connected.</p>
    <div className="web-alert-form"><label><span>Metric</span><select value={metric} onChange={event => setMetric(event.target.value)}>{ALARM_METRICS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label><span>Condition</span><select value={condition} onChange={event => setCondition(event.target.value)}><option value="below">Below</option><option value="above">Above</option></select></label><label><span>Threshold</span><input type="number" step="any" value={threshold} onChange={event => setThreshold(event.target.value)} /></label><label><span>Repeat</span><select value={repeatSeconds} onChange={event => setRepeatSeconds(Number(event.target.value))}>{ALARM_INTERVALS.map(seconds => <option key={seconds} value={seconds}>{seconds < 60 ? `${seconds} Seconds` : `${seconds / 60} Minutes`}</option>)}</select></label><button type="button" onClick={addAlarm}>Add Alert</button></div>
    {permission !== 'granted' && permission !== 'unsupported' && <button type="button" onClick={requestPermission}>Enable Browser Notifications</button>}
    {permission === 'unsupported' && <p role="status">Browser notifications are not supported here; spoken alerts still work.</p>}
    <ul>{alarms.map(alarm => <li key={alarm.id}><span>{ALARM_METRICS.find(item => item.key === alarm.metric)?.label} {alarm.condition} {alarm.threshold}</span><button type="button" onClick={() => update(alarm.id, { enabled: !alarm.enabled })}>{alarm.enabled ? 'On' : 'Off'}</button>{alarm.lastTriggeredAt && <button type="button" onClick={() => update(alarm.id, { acknowledged: true })}>Acknowledge</button>}<button type="button" onClick={() => setAlarms(previous => previous.filter(item => item.id !== alarm.id))}>Remove</button>{isAlarmSafe(alarm, snapshot?.[alarm.metric]) && <small>Safe</small>}</li>)}</ul>
  </details>;
}

export default WebAlarmControls;
