import test from 'node:test';
import assert from 'node:assert/strict';
import { formatOccurrenceTime } from '../src/utils/timeFormatting.js';

test('formats occurrence timestamps without seconds', () => {
  const formatted = formatOccurrenceTime(Date.UTC(2026, 0, 1, 12, 34, 56));
  assert.ok((formatted.match(/:/g) || []).length <= 1);
  assert.equal(formatted.includes(':56'), false);
});
