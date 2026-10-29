import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCMITimespan, parseCMITimespan } from './time';

test('formatCMITimespan formats milliseconds to SCORM 1.2 HHHH:MM:SS.SS format', () => {
  // 0 ms -> 0000:00:00.00
  assert.equal(formatCMITimespan(0), '0000:00:00.00');

  // 1 second (1000 ms) -> 0000:00:01.00
  assert.equal(formatCMITimespan(1000), '0000:00:01.00');

  // 65 seconds (65000 ms) -> 0000:01:05.00
  assert.equal(formatCMITimespan(65000), '0000:01:05.00');

  // 1 hour, 2 minutes, 3 seconds and 450ms -> 0001:02:03.45
  const ms = (3600 + 120 + 3) * 1000 + 450;
  assert.equal(formatCMITimespan(ms), '0001:02:03.45');
});

test('parseCMITimespan correctly parses SCORM 1.2 timespans', () => {
  assert.equal(parseCMITimespan('0000:00:00.00'), 0);
  assert.equal(parseCMITimespan('0000:00:01.00'), 1000);
  assert.equal(parseCMITimespan('0000:01:05.00'), 65000);

  // Fallback on invalid strings
  assert.equal(parseCMITimespan(''), 0);
  assert.equal(parseCMITimespan('invalid'), 0);
});
