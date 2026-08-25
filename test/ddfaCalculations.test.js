import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDDFA,
  calculateDDFAExponent,
  ddfaFluctuation,
  filterDDFAIntervals
} from '../src/utils/ddfaCalculations.js';

function referenceFixture(length = 120) {
  return Array.from({ length }, (_, index) =>
    850 + 27 * Math.sin(index * 0.37) + 11 * Math.cos(index * 0.11) + (((index * 17) % 13) - 6) * 0.8
  );
}

test('published DDFA preprocessing applies bounds and seven-beat 10% median rule', () => {
  const result = filterDDFAIntervals([199, 1000, 1000, 1000, 1200, 1000, 1000, 1000, 2001]);
  assert.deepEqual(result.accepted, [1000, 1000, 1000, 1000, 1000, 1000]);
  assert.equal(result.inputCount, 9);
  assert.equal(result.boundedCount, 7);
  assert.equal(result.removedCount, 3);
});

test('10% median boundary is retained exactly', () => {
  assert.deepEqual(filterDDFAIntervals([1000, 1000, 1000, 1100, 1000, 1000, 1000]).accepted,
    [1000, 1000, 1000, 1100, 1000, 1000, 1000]);
});

test('quadratic detrending removes an integrated quadratic profile', () => {
  const linearIntervals = Array.from({ length: 50 }, (_, index) => 700 + 2 * index);
  assert.equal(ddfaFluctuation(linearIntervals, 10), null);
});

test('DDFA-2 exact fixture matches an independent NumPy polynomial-fit reference', () => {
  const intervals = referenceFixture();
  assert.ok(Math.abs(ddfaFluctuation(intervals.slice(-50), 10) - 6.671931455416474) < 1e-9);
  assert.ok(Math.abs(calculateDDFAExponent(intervals, 10) - 2.60243512266581) < 1e-9);
  assert.ok(Math.abs(calculateDDFAExponent(intervals, 20) - 1.6664770165990108) < 1e-9);
});

test('analysis returns the complete available scale profile and qualified alpha10', () => {
  const result = analyzeDDFA([{ rrIntervals: referenceFixture() }]);
  assert.equal(result.available, true);
  assert.equal(result.variant, 'DDFA-2');
  assert.equal(result.headlineScale, 10);
  assert.equal(result.profile[0].scale, 5);
  assert.equal(result.profile.at(-1).scale, 20);
  assert.equal(result.profile.length, 16);
  assert.equal(result.alpha10, result.profile.find(point => point.scale === 10).alpha);
});

test('analysis withholds alpha10 when fewer than 50 clean intervals remain', () => {
  const result = analyzeDDFA([{ rrIntervals: referenceFixture(49) }]);
  assert.equal(result.available, false);
  assert.equal(result.alpha10, null);
  assert.match(result.reason, /50 clean RR intervals/);
});

test('constant and non-finite input never produces a fabricated exponent', () => {
  const result = analyzeDDFA([{ rrIntervals: [...Array(60).fill(800), NaN, Infinity] }]);
  assert.equal(result.available, false);
  assert.equal(result.alpha10, null);
  assert.deepEqual(result.profile, []);
});
