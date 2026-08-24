import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHRV } from '../src/utils/hrvCalculations.js';

function parityIntervals() {
  return Array.from({ length: 120 }, (_, index) => {
    if (index === 30 || index === 90) return 1600;
    return index % 2 === 0 ? 980 : 1020;
  });
}

test('calculates RMSSD from the same official-web compatibility fixture as Android', () => {
  const intervals = parityIntervals();
  const result = analyzeHRV(intervals.map(interval => ({
    heartRate: 72,
    rrIntervals: [interval]
  })));

  assert.equal(result.error, null);
  assert.equal(result.rrCount, 120);
  assert.ok(Math.abs(result.rmssd - 113.37451879767801) < 0.0001);
  assert.ok(Math.abs(result.sdnn - 19.997127055935756) < 0.0001);
});

test('requires sixty physiologically plausible intervals', () => {
  const intervals = [
    ...Array.from({ length: 59 }, (_, index) => index % 2 === 0 ? 980 : 1020),
    1600
  ];
  const result = analyzeHRV(intervals.map(interval => ({
    heartRate: 72,
    rrIntervals: [interval]
  })));

  assert.equal(result.error, null);
  assert.equal(result.rrCount, 60);
});

test('withholds SDNN when NN filtering removes the series', () => {
  const intervals = [...Array(30).fill(300), ...Array(30).fill(2000)];
  const result = analyzeHRV(intervals.map(interval => ({
    heartRate: 72,
    rrIntervals: [interval]
  })));

  assert.equal(result.error, null);
  assert.ok(Number.isFinite(result.rmssd));
  assert.equal(result.sdnn, null);
});
