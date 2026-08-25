import test from 'node:test';
import assert from 'node:assert/strict';
import { chartPointsToCsv, createCsvFilename } from '../src/utils/csvExport.js';

test('exports ordered retained records with units, sessions, and sample counts', () => {
  const csv = chartPointsToCsv([
    { timestamp: 2000, sessionStartedAt: 1000, heartRate: 72, rmssd: null, sdnn: 34.5, brpm: 13, sampleCount: 4, heartRateCount: 4 },
    { timestamp: 1500, sessionStartedAt: 1000, heartRate: 70, rmssd: 42, sdnn: 33, brpm: 12 }
  ]);
  const lines = csv.split('\r\n');
  assert.match(lines[0], /Timestamp ISO,Local Time,Session Started ISO,DDFA Alpha10 \(unitless\),RMSSD \(ms\)/);
  assert.match(lines[1], /^1970-01-01T00:00:01\.500Z,/);
  assert.match(lines[1], /,,42,33,70,12,1,0,1,1,1,1$/);
  assert.match(lines[2], /,,,34\.5,72,13,4,0,0,1,4,1$/);
});

test('creates a stable dated CSV filename', () => {
  assert.equal(createCsvFilename(new Date('2026-08-24T12:00:00Z')), 'heart-rate-history-2026-08-24.csv');
});
