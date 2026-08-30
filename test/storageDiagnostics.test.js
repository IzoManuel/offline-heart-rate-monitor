import test from 'node:test';
import assert from 'node:assert/strict';
import { formatStorageBytes, readStorageDiagnostics, storageHealth } from '../src/utils/storageDiagnostics.js';

test('formats storage sizes and assigns practical health thresholds', () => {
  assert.equal(formatStorageBytes(1024 * 1024), '1.0 MB');
  assert.equal(formatStorageBytes(2 * 1024 * 1024), '2.0 MB');
  assert.equal(storageHealth(40, 100).tone, 'good');
  assert.equal(storageHealth(50, 100).tone, 'warning');
  assert.equal(storageHealth(80, 100).tone, 'danger');
});

test('reads estimated quota and chart count without exposing metric values', async () => {
  const details = await readStorageDiagnostics({ environment: { navigator: { storage: { estimate: async () => ({ usage: 25, quota: 100 }) } } }, countPoints: async () => 12 });
  assert.deepEqual({ usage: details.usage, quota: details.quota, pointCount: details.pointCount, tone: details.health.tone }, { usage: 25, quota: 100, pointCount: 12, tone: 'good' });
});
