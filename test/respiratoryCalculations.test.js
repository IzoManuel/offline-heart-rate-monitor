import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateRespiratoryRate } from '../src/utils/respiratoryCalculations.js';

function createRespiratorySignal({ breathsPerMinute, durationSeconds = 120, amplitudeMs = 70 }) {
  const readings = [];
  let elapsedSeconds = 0;

  while (elapsedSeconds < durationSeconds) {
    const interval = 900 + amplitudeMs * Math.sin(
      2 * Math.PI * (breathsPerMinute / 60) * elapsedSeconds
    );
    readings.push({
      heartRate: 60000 / interval,
      rrIntervals: [interval]
    });
    elapsedSeconds += interval / 1000;
  }

  return readings;
}

test('estimates a clear resting breathing rhythm from uneven RR timing', () => {
  const result = estimateRespiratoryRate(createRespiratorySignal({ breathsPerMinute: 15 }));

  assert.equal(result.available, true);
  assert.ok(Math.abs(result.breathsPerMinute - 15) < 0.6);
  assert.ok(['Moderate', 'High'].includes(result.quality));
  assert.match(result.method, /Lomb/);
});

test('matches the Android BRPM parity fixture exactly', () => {
  const expectedBrpm = 15;
  let elapsedSeconds = 0;
  const readings = Array.from({ length: 140 }, () => {
    const interval = 900 + 55 * Math.sin(
      2 * Math.PI * (expectedBrpm / 60) * elapsedSeconds
    );
    elapsedSeconds += interval / 1000;
    return { heartRate: 60000 / interval, rrIntervals: [interval] };
  });

  const result = estimateRespiratoryRate(readings);
  assert.equal(result.available, true);
  assert.ok(Math.abs(result.breathsPerMinute - 15.05749631999197) < 1e-7);
  assert.equal(result.rrCount, 140);
});

test('estimates a second rate independently from another two-minute window', () => {
  const result = estimateRespiratoryRate(createRespiratorySignal({ breathsPerMinute: 19 }));

  assert.equal(result.available, true);
  assert.ok(Math.abs(result.breathsPerMinute - 19) < 0.6);
});

test('withholds an estimate when too few RR intervals are supplied', () => {
  const result = estimateRespiratoryRate(createRespiratorySignal({
    breathsPerMinute: 15,
    durationSeconds: 20
  }));

  assert.equal(result.available, false);
  assert.match(result.error, /Insufficient RR data/);
});

test('withholds an estimate when RR timing has no respiratory variation', () => {
  const readings = Array.from({ length: 140 }, () => ({ heartRate: 60, rrIntervals: [1000] }));
  const result = estimateRespiratoryRate(readings);

  assert.equal(result.available, false);
  assert.match(result.error, /variability is too small/);
});

test('withholds an estimate when variable RR data has no dominant respiratory rhythm', () => {
  let seed = 123456789;
  const readings = Array.from({ length: 140 }, () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    const interval = 850 + ((seed / 2 ** 32) - 0.5) * 160;
    return { heartRate: 60000 / interval, rrIntervals: [interval] };
  });
  const result = estimateRespiratoryRate(readings);

  assert.equal(result.available, false);
  assert.match(result.error, /No clear respiratory rhythm/);
});
