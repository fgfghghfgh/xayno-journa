import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareCoachMemoryUpdates } from './coach-memory.mjs';

const timestamp = '2026-11-23T00:00:00.000Z';

test('only labels a directly quoted user statement when its evidence is in the current message', () => {
  const result = prepareCoachMemoryUpdates([], [
    { content: 'نام کاربر رسول است', source: 'user_statement', evidence: 'اسمم رسول است', confidence: 0.98 },
    { content: 'کاربر دنبال جبران ضرر است', source: 'user_statement', evidence: 'جبران ضرر', confidence: 0.9 },
  ], 'اسمم رسول است', timestamp);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].memorySource, 'user_statement');
});

test('keeps inferences distinctly labeled and does not erase existing memories on an empty update', () => {
  const existing = [
    { id: 'coach_memory_a', content: 'ترجیح می‌دهد پاسخ کوتاه باشد', memorySource: 'automatic', createdAt: timestamp },
  ];
  const result = prepareCoachMemoryUpdates(existing, [], '', timestamp);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].memorySource, 'coach_inference');
  assert.equal(result.records[0].confidence, 0.45);
});

test('allows an explicit correction to replace only the referenced memory', () => {
  const existing = [
    { id: 'coach_memory_wrong', content: 'نام کاربر رسول است', memorySource: 'coach_inference', createdAt: timestamp },
    { id: 'coach_memory_keep', content: 'هدف کاربر حرفه‌ای‌شدن است', memorySource: 'user_statement', createdAt: timestamp },
  ];
  const result = prepareCoachMemoryUpdates(existing, [
    {
      content: 'نام کاربر رضا است',
      source: 'user_statement',
      evidence: 'اسمم رضاست',
      confidence: 1,
      supersedes: ['coach_memory_wrong'],
    },
  ], 'اشتباهه، اسمم رضاست؛ نه رسول.', timestamp);
  assert.deepEqual(result.removedIds, ['coach_memory_wrong']);
  assert.deepEqual(result.records.map((memory) => memory.content).sort(), [
    'هدف کاربر حرفه‌ای‌شدن است',
    'نام کاربر رضا است',
  ].sort());
});

test('does not let an ordinary message remove memories or save unsupported claims', () => {
  const existing = [
    { id: 'coach_memory_keep', content: 'هدف کاربر حرفه‌ای‌شدن است', memorySource: 'user_statement', createdAt: timestamp },
  ];
  const result = prepareCoachMemoryUpdates(existing, [
    {
      content: 'کاربر ترس از ضرر دارد',
      source: 'user_statement',
      evidence: 'من از ضرر می‌ترسم',
      confidence: 0.95,
      supersedes: ['coach_memory_keep'],
    },
  ], 'امروز چارت سولانا چه می‌گوید؟', timestamp);
  assert.deepEqual(result.removedIds, []);
  assert.deepEqual(result.records.map((memory) => memory.id), ['coach_memory_keep']);
});
