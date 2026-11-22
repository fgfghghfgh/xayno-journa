import assert from 'node:assert/strict';
import test from 'node:test';
import { isExplicitSocraticRequest, shouldUseSocraticMode } from './coach-socratic.mjs';

test('uses a Socratic turn periodically for reflective messages', () => {
  assert.equal(shouldUseSocraticMode('چرا بعد از ضرر دوباره وارد شدم؟', 1), false);
  assert.equal(shouldUseSocraticMode('چرا بعد از ضرر دوباره وارد شدم؟', 2), true);
  assert.equal(shouldUseSocraticMode('چرا بعد از ضرر دوباره وارد شدم؟', 3), false);
});

test('honors an explicit Socratic request regardless of turn count', () => {
  assert.equal(shouldUseSocraticMode('لطفاً سقراطی باش و فقط سؤال بپرس', 0), true);
  assert.equal(shouldUseSocraticMode('کمکم کن خودم به جواب برسم', 7), true);
  assert.equal(isExplicitSocraticRequest('فقط سؤال بپرس'), true);
  assert.equal(isExplicitSocraticRequest('چرا بعد از ضرر وارد شدم؟'), false);
});

test('keeps factual requests and urgent distress out of Socratic mode', () => {
  assert.equal(shouldUseSocraticMode('اندازهٔ پوزیشن را چطور حساب کنم؟', 2), false);
  assert.equal(shouldUseSocraticMode('فشار روانی شدید دارم و ناامید شدم، فقط سقراطی باش', 4), false);
  assert.equal(shouldUseSocraticMode('', 2), false);
});
