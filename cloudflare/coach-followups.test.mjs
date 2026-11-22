import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCoachFollowupOutcome,
  COACH_FOLLOWUP_DELAY_MS,
  isCoachFollowupDue,
  markCoachFollowupSent,
} from './coach-followups.mjs';

test('makes an accepted exercise due after one day and stops after it is sent', () => {
  const createdAt = '2026-01-01T00:00:00.000Z';
  const session = { homework: 'تمرین مکث', createdAt, status: 'completed' };
  assert.equal(isCoachFollowupDue(session, Date.parse(createdAt) + COACH_FOLLOWUP_DELAY_MS - 1), false);
  assert.equal(isCoachFollowupDue(session, Date.parse(createdAt) + COACH_FOLLOWUP_DELAY_MS), true);
  const sent = markCoachFollowupSent(session, new Date('2026-01-02T00:00:00.000Z'));
  assert.equal(sent.followUpStatus, 'awaiting_response');
  assert.equal(isCoachFollowupDue(sent, Date.parse('2026-01-10T00:00:00.000Z')), false);
});

test('resolves a completed commitment and stores a blocker without prompting again', () => {
  const session = { homework: 'تمرین مکث', followUpStatus: 'awaiting_response', followUpReminderCount: 1 };
  const completed = applyCoachFollowupOutcome(session, { status: 'completed', note: 'انجام داد' });
  assert.equal(completed.followUpStatus, 'completed');
  assert.equal(isCoachFollowupDue(completed, Date.now() + COACH_FOLLOWUP_DELAY_MS * 10), false);
  const blocked = applyCoachFollowupOutcome(session, { status: 'blocked', note: 'فرصت نشد' });
  assert.equal(blocked.followUpStatus, 'blocked');
  assert.equal(blocked.followUpOutcome, 'فرصت نشد');
  const cancelled = applyCoachFollowupOutcome(session, { status: 'cancelled', note: 'دیگر نمی‌خواهم پیگیری شود' });
  assert.equal(cancelled.followUpStatus, 'cancelled');
  assert.equal(isCoachFollowupDue(cancelled, Date.now() + COACH_FOLLOWUP_DELAY_MS * 10), false);
});

test('schedules a single later check when the user has not done the exercise yet', () => {
  const now = new Date('2026-01-05T00:00:00.000Z');
  const session = { homework: 'تمرین مکث', followUpStatus: 'awaiting_response', followUpReminderCount: 1 };
  const retry = applyCoachFollowupOutcome(session, { status: 'retry' }, now);
  assert.equal(retry.followUpStatus, 'pending');
  assert.equal(retry.followUpDueAt, new Date(now.getTime() + COACH_FOLLOWUP_DELAY_MS).toISOString());
  assert.equal(isCoachFollowupDue(retry, now.getTime() + COACH_FOLLOWUP_DELAY_MS), true);
});

test('does not send more than the maximum follow-up reminders', () => {
  const session = { homework: 'تمرین مکث', followUpStatus: 'pending', followUpReminderCount: 2 };
  assert.equal(isCoachFollowupDue(session, Date.now() + COACH_FOLLOWUP_DELAY_MS * 10), false);
  assert.equal(applyCoachFollowupOutcome(session, { status: 'retry' }).followUpStatus, 'awaiting_response');
});
