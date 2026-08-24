import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SESSION_STORAGE_KEY,
  clearSessionSnapshot,
  createSessionSnapshot,
  loadSessionSnapshot,
  parseSessionSnapshot,
  saveSessionSnapshot
} from '../src/utils/sessionStorage.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    has: key => values.has(key)
  };
}

function snapshot() {
  return createSessionSnapshot({
    sessionStartedAt: 1000,
    savedAt: 5000,
    currentHR: 68,
    stats: { average: 70, min: 62, max: 91, minAt: 2000, maxAt: 3000 },
    readingsCount: 240,
    analysisResults: { rmssd: 44.2, sdnn: 51.3, analyzedAt: 5000 },
    rmssdExtrema: { min: { value: 40, occurredAt: 3000 }, max: { value: 48, occurredAt: 4000 } },
    brpmExtrema: { min: { value: 13.5, occurredAt: 3000 }, max: { value: 16.2, occurredAt: 4000 } }
  });
}

test('saves and restores a versioned session snapshot', () => {
  const storage = memoryStorage();
  const expected = snapshot();

  assert.equal(saveSessionSnapshot(expected, storage), true);
  assert.deepEqual(loadSessionSnapshot(storage), expected);
});

test('rejects malformed and version-mismatched snapshots safely', () => {
  assert.equal(parseSessionSnapshot('{broken'), null);
  assert.equal(parseSessionSnapshot(JSON.stringify({ ...snapshot(), version: 999 })), null);
  assert.equal(parseSessionSnapshot(JSON.stringify({ ...snapshot(), stats: null })), null);
});

test('clears the saved session', () => {
  const storage = memoryStorage();
  saveSessionSnapshot(snapshot(), storage);
  assert.equal(storage.has(SESSION_STORAGE_KEY), true);
  assert.equal(clearSessionSnapshot(storage), true);
  assert.equal(loadSessionSnapshot(storage), null);
});
