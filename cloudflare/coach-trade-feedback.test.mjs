import assert from 'node:assert/strict';
import test from 'node:test';
import { coachPatternMatches } from './coach-trade-feedback.mjs';

test('matches repeated Persian phrases despite Arabic letter variants and punctuation', () => {
  assert.equal(coachPatternMatches('فومو، ورود عجولانه', 'ورود عجولانه بعد از فومو'), true);
  assert.equal(coachPatternMatches('كندل شکسته', 'کندل شکسته'), true);
});

test('does not treat unrelated or generic partial phrases as a repeated pattern', () => {
  assert.equal(coachPatternMatches('ورود با شکست مقاومت', 'خروج با حد ضرر'), false);
  assert.equal(coachPatternMatches('ریسک', 'ریسک زیاد'), false);
  assert.equal(coachPatternMatches('', 'فومو'), false);
});
