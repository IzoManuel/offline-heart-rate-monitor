import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHeartRate } from '../src/utils/bluetooth.js';

test('converts Bluetooth RR units of 1/1024 second into milliseconds', () => {
  const packet = new Uint8Array([0x10, 60, 0x00, 0x04]);
  const parsed = parseHeartRate(new DataView(packet.buffer));

  assert.equal(parsed.heartRate, 60);
  assert.deepEqual(parsed.rrIntervals, [1000]);
});
