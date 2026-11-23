import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCoachPersonalProfileAnswer,
  COACH_PERSONAL_PROFILE_QUESTIONS,
  createCoachPersonalProfile,
} from './coach-personal-profile.mjs';

test('stores first-time answers in order and resumes without replacing prior responses', () => {
  const started = createCoachPersonalProfile(new Date('2026-11-23T00:00:00.000Z'));
  const first = applyCoachPersonalProfileAnswer(started, {
    questionIndex: 0,
    answer: 'برای رسیدن به استقلال مالی.',
  }, new Date('2026-11-23T00:01:00.000Z'));
  assert.equal(first.profile.answers[0].answer, 'برای رسیدن به استقلال مالی.');
  assert.equal(first.profile.status, 'in_progress');

  const outOfOrder = applyCoachPersonalProfileAnswer(first.profile, {
    questionIndex: 2,
    answer: 'پاسخ زودهنگام',
  });
  assert.match(outOfOrder.error, /به‌ترتیب/);

  const duplicate = applyCoachPersonalProfileAnswer(first.profile, {
    questionIndex: 0,
    answer: 'برای رسیدن به استقلال مالی.',
  });
  assert.equal(duplicate.idempotent, true);
  assert.equal(duplicate.profile.answers.length, 1);
});

test('allows skipping a personal question and completes only after all sections', () => {
  let profile = createCoachPersonalProfile();
  for (let questionIndex = 0; questionIndex < COACH_PERSONAL_PROFILE_QUESTIONS.length; questionIndex += 1) {
    const result = applyCoachPersonalProfileAnswer(profile, {
      questionIndex,
      answer: questionIndex === 6 ? '' : `پاسخ ${questionIndex}`,
      skipped: questionIndex === 6,
    });
    assert.equal(result.error, undefined);
    profile = result.profile;
  }
  assert.equal(profile.status, 'completed');
  assert.equal(profile.answers.length, COACH_PERSONAL_PROFILE_QUESTIONS.length);
  assert.equal(profile.answers[6].skipped, true);
  assert.equal(profile.answers[6].answer, '');
  assert.ok(profile.completedAt);
  assert.ok(applyCoachPersonalProfileAnswer(profile, { questionIndex: 9, answer: 'دیگر' }).error);
});

test('does not accept empty, oversized, or invalid section responses', () => {
  const profile = createCoachPersonalProfile();
  assert.ok(applyCoachPersonalProfileAnswer(profile, { questionIndex: 0, answer: ' ' }).error);
  assert.ok(applyCoachPersonalProfileAnswer(profile, { questionIndex: 0, answer: 'x'.repeat(3001) }).error);
  assert.ok(applyCoachPersonalProfileAnswer(profile, { questionIndex: 0.5, answer: 'پاسخ' }).error);
  assert.ok(applyCoachPersonalProfileAnswer(profile, { questionIndex: null, answer: 'پاسخ' }).error);
});
