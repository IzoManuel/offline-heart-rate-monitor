import React, { useEffect, useMemo, useState } from 'react';
import { isLiveAverageScope } from '../utils/averageScope';

const METRICS = [
  ['heartRate', 'Heart Rate'], ['ddfaAlpha10', 'DDFA α10'], ['rmssd', 'RMSSD'], ['sdnn', 'SDNN'], ['brpm', 'BRPM']
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(value) { return String(value).padStart(2, '0'); }
function dateKey(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function parseDateKey(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}
function localDateTime(dateValue, time, fallback) {
  const date = parseDateKey(dateValue);
  if (!date) return fallback;
  const [hours, minutes] = (time || '00:00').split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours || 0, minutes || 0).getTime();
}
function monthDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + total) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day < 1 || day > total ? null : new Date(month.getFullYear(), month.getMonth(), day);
  });
}

function DateRangePicker({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseDateKey(startDate) || new Date());
  const days = monthDays(month);
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const label = start && end ? `${start.toLocaleDateString()} – ${end.toLocaleDateString()}` : start ? `${start.toLocaleDateString()} – Choose end date` : 'Choose a date range';
  const selectDay = date => {
    const key = dateKey(date);
    if (!startDate || (startDate && endDate)) onChange({ startDate: key, endDate: '' });
    else if (key < startDate) onChange({ startDate: key, endDate: startDate });
    else onChange({ startDate, endDate: key });
  };
  return <div className="date-range-picker">
    <button type="button" className="date-range-trigger" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(value => !value)}>{label}</button>
    {open && <div className="date-range-popover" role="dialog" aria-label="Choose date range">
      <div className="date-range-header"><button type="button" className="icon-button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><strong>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong><button type="button" className="icon-button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div>
      <div className="date-range-weekdays">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>
      <div className="date-range-grid">{days.map((date, index) => {
        if (!date) return <span key={`empty-${index}`} className="date-range-empty" aria-hidden="true" />;
        const key = dateKey(date);
        const selected = key === startDate || key === endDate;
        const inRange = Boolean(startDate && endDate && key > startDate && key < endDate);
        return <button key={key} type="button" className={`date-range-day${selected ? ' selected' : ''}${inRange ? ' in-range' : ''}`} aria-label={date.toLocaleDateString()} aria-pressed={selected} onClick={() => selectDay(date)}>{date.getDate()}</button>;
      })}</div>
      <p className="date-range-status" aria-live="polite">{start && !end ? 'Now choose the end date.' : 'Select a start date to begin.'}</p>
      <button type="button" className="form-cancel" onClick={() => setOpen(false)}>Done</button>
    </div>}
  </div>;
}

function AverageScopeControls({ points, sessionStartedAt, onChange }) {
  const [scope, setScope] = useState('session');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');
  const [includeTime, setIncludeTime] = useState(false);
  const range = useMemo(() => {
    if (scope === 'session') return { from: sessionStartedAt ?? -Infinity, to: Infinity };
    if (scope === 'today') { const start = new Date(); start.setHours(0, 0, 0, 0); return { from: start.getTime(), to: Date.now() }; }
    return { from: includeTime ? localDateTime(startDate, startTime, -Infinity) : (parseDateKey(startDate)?.setHours(0, 0, 0, 0) ?? -Infinity), to: includeTime ? localDateTime(endDate, endTime, Infinity) : (parseDateKey(endDate)?.setHours(23, 59, 59, 999) ?? Infinity) };
  }, [scope, sessionStartedAt, startDate, endDate, startTime, endTime, includeTime]);
  const values = useMemo(() => Object.fromEntries(METRICS.map(([key]) => {
    const selected = points.filter(point => point.timestamp >= range.from && point.timestamp <= range.to && Number.isFinite(point[key]));
    return [key, selected.length ? selected.reduce((sum, point) => sum + point[key], 0) / selected.length : null];
  })), [points, range]);
  const rangeValid = scope !== 'custom' || (startDate && endDate && range.from <= range.to);
  useEffect(() => { if (isLiveAverageScope(scope)) onChange({ values, label: scope === 'session' ? 'Current Session' : 'Today' }); }, [scope, values, onChange]);
  const apply = () => onChange({ values, label: scope === 'session' ? 'Current Session' : scope === 'today' ? 'Today' : 'Custom Range' });
  return <section className="average-scope-controls" aria-labelledby="average-scope-heading">
    <h2 id="average-scope-heading">Card Average Scope</h2><p>Choose which retained measurements supply the Average values on the cards.</p>
    <label className="form-field"><span>Scope</span><select value={scope} onChange={event => setScope(event.target.value)}><option value="session">Current Session</option><option value="today">Today</option><option value="custom">Custom Date/Time Range</option></select></label>
    {scope === 'custom' && <div className="average-range-picker"><DateRangePicker startDate={startDate} endDate={endDate} onChange={({ startDate: nextStart, endDate: nextEnd }) => { setStartDate(nextStart); setEndDate(nextEnd); }} /><p className="date-range-help">Select a start date, then an end date. The days between them are highlighted.</p><label className="date-range-time-toggle"><input type="checkbox" checked={includeTime} onChange={event => setIncludeTime(event.target.checked)} /> Use specific times instead of whole days</label>{includeTime && <div className="average-range-times"><label className="form-field"><span>Start time</span><input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /></label><label className="form-field"><span>End time</span><input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} /></label></div>}</div>}
    <button type="button" className="trend-action" disabled={!rangeValid} onClick={apply}>Apply Average Scope</button>
  </section>;
}

export default AverageScopeControls;
