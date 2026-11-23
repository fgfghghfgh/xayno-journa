import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRepeatedExcuseReport } from './coach-repeated-excuses.mjs';

test('counts only repeated phrases in user messages and provides exact examples', () => {
  const result = buildRepeatedExcuseReport([
    { id: 'a', role: 'user', createdAt: '2026-11-20T08:00:00Z', content: 'بازم فکر کردم الان از بازار جا می‌مونم!' },
    { id: 'b', role: 'assistant', createdAt: '2026-11-20T08:01:00Z', content: 'استاد متن مشابه از سمت خودش دارد.' },
    { id: 'c', role: 'user', createdAt: '2026-11-21T08:00:00Z', content: 'دوباره فکر کردم الان از بازار جا می‌مونم.' },
    { id: 'c', role: 'user', createdAt: '2026-11-21T08:00:00Z', content: 'دوباره فکر کردم الان از بازار جا می‌مونم.' },
    { id: 'd', role: 'user', createdAt: '2026-11-21T09:00:00Z', content: 'این جمله هیچ شباهتی ندارد.' },
  ]);
  assert.equal(result.scannedMessageCount, 3);
  assert.equal(result.repeatedPhrases.length, 1);
  assert.equal(result.repeatedPhrases[0].count, 2);
  assert.equal(result.repeatedPhrases[0].examples[0].text, 'بازم فکر کردم الان از بازار جا می‌مونم!');
});

test('uses the onboarding statement as one source and does not invent an excuse', () => {
  const result = buildRepeatedExcuseReport([
    { id: 'a', role: 'user', createdAt: '2026-11-20T08:00:00Z', content: 'وقتی ضرر می‌کنم باید جبرانش کنم.' },
    { id: 'b', role: 'user', createdAt: '2026-11-21T08:00:00Z', content: 'امروز هوا خوب است.' },
  ], [
    { key: 'fears_and_excuses', answer: 'وقتی ضرر می‌کنم باید جبرانش کنم.', updatedAt: '2026-11-19T08:00:00Z' },
    { key: 'goals', answer: 'می‌خواهم منظم شوم.' },
  ]);
  assert.equal(result.repeatedPhrases.length, 1);
  assert.equal(result.repeatedPhrases[0].count, 2);
  assert.deepEqual(result.repeatedPhrases[0].examples.map((item) => item.source), ['profile', 'chat']);
});

test('rejects generic single-word coincidences and invalid input', () => {
  const report = buildRepeatedExcuseReport([
    { id: 'a', role: 'user', content: 'ریسک' },
    { id: 'b', role: 'user', content: 'ریسک زیاد' },
  ]);
  assert.equal(report.repeatedPhrases.length, 0);
  assert.throws(() => buildRepeatedExcuseReport(null), /arrays/);
});
