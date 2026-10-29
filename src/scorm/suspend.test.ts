import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeSuspendData, decodeSuspendData, DEFAULT_SUSPEND_PAYLOAD } from './suspend';

test('encodeSuspendData and decodeSuspendData roundtrip properly', () => {
  const payload = {
    currentPageIndex: 3,
    visitedPages: ['page_1', 'page_2', 'page_3'],
    quizAnswers: { quiz_1: ['opt_2'] },
    quizScores: { quiz_1: 50 },
    totalScore: 50,
    maxScore: 100,
    percentageScore: 50,
    isCompleted: true,
    isPassed: false,
  };

  const encoded = encodeSuspendData(payload);
  assert.ok(typeof encoded === 'string');
  assert.ok(encoded.length > 0);

  const decoded = decodeSuspendData(encoded);
  assert.equal(decoded.currentPageIndex, 3);
  assert.deepEqual(decoded.visitedPages, ['page_1', 'page_2', 'page_3']);
  assert.deepEqual(decoded.quizAnswers, { quiz_1: ['opt_2'] });
  assert.equal(decoded.percentageScore, 50);
  assert.equal(decoded.isCompleted, true);
  assert.equal(decoded.isPassed, false);
});

test('decodeSuspendData gracefully handles null, undefined, and corrupt strings', () => {
  const fallbackNull = decodeSuspendData(null);
  assert.equal(fallbackNull.currentPageIndex, 0);

  const fallbackEmpty = decodeSuspendData('');
  assert.equal(fallbackEmpty.currentPageIndex, 0);

  const fallbackCorrupt = decodeSuspendData('{corrupt json...');
  assert.equal(fallbackCorrupt.currentPageIndex, 0);
});
