import React, { useMemo, useState } from 'react';

const METRICS = [
  ['heartRate', 'Heart Rate'], ['ddfaAlpha10', 'DDFA α10'], ['rmssd', 'RMSSD'], ['sdnn', 'SDNN'], ['brpm', 'BRPM']
];

function AverageScopeControls({ points, sessionStartedAt, onChange }) {
  const [scope, setScope] = useState('session');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const range = useMemo(() => {
    if (scope === 'session') return { from: sessionStartedAt ?? -Infinity, to: Infinity };
    if (scope === 'today') { const start = new Date(); start.setHours(0, 0, 0, 0); return { from: start.getTime(), to: Date.now() }; }
    return { from: from ? new Date(from).getTime() : -Infinity, to: to ? new Date(to).getTime() : Infinity };
  }, [scope, sessionStartedAt, from, to]);
  const values = useMemo(() => Object.fromEntries(METRICS.map(([key]) => {
    const selected = points.filter(point => point.timestamp >= range.from && point.timestamp <= range.to && Number.isFinite(point[key]));
    return [key, selected.length ? selected.reduce((sum, point) => sum + point[key], 0) / selected.length : null];
  })), [points, range]);
  const apply = () => onChange({ values, label: scope === 'session' ? 'Current Session' : scope === 'today' ? 'Today' : 'Custom Range' });
  return <section className="average-scope-controls" aria-labelledby="average-scope-heading">
    <h2 id="average-scope-heading">Card Average Scope</h2><p>Choose which retained measurements supply the Average values on the cards.</p>
    <label><span>Scope</span><select value={scope} onChange={event => setScope(event.target.value)}><option value="session">Current Session</option><option value="today">Today</option><option value="custom">Custom Date/Time Range</option></select></label>
    {scope === 'custom' && <div className="average-range"><label><span>From</span><input type="datetime-local" value={from} onChange={event => setFrom(event.target.value)} /></label><label><span>To</span><input type="datetime-local" value={to} onChange={event => setTo(event.target.value)} /></label></div>}
    <button type="button" className="trend-action" disabled={scope === 'custom' && from && to && range.from > range.to} onClick={apply}>Apply Average Scope</button>
  </section>;
}

export default AverageScopeControls;
