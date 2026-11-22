export const COACH_FOLLOWUP_DELAY_MS = 24 * 60 * 60 * 1000;
export const COACH_FOLLOWUP_MAX_REMINDERS = 2;

export function isCoachFollowupDue(session, now = Date.now()) {
  if (!String(session?.homework || session?.followUp || '').trim()) return false;
  const status = session.followUpStatus || 'pending';
  const reminderCount = Math.max(0, Number(session.followUpReminderCount) || 0);
  if (status !== 'pending' || reminderCount >= COACH_FOLLOWUP_MAX_REMINDERS) return false;
  const dueAt = Date.parse(String(session.followUpDueAt || ''));
  if (Number.isFinite(dueAt)) return dueAt <= now;
  const updatedAt = Date.parse(String(session.updatedAt || session.createdAt || ''));
  return Number.isFinite(updatedAt) && now - updatedAt >= COACH_FOLLOWUP_DELAY_MS;
}

export function applyCoachFollowupOutcome(session, update, now = new Date()) {
  const status = update?.status;
  if (!['completed', 'blocked', 'retry', 'cancelled'].includes(status)) return null;
  const note = typeof update.note === 'string' ? update.note.trim().slice(0, 1000) : '';
  const next = {
    ...session,
    followUpOutcome: note,
    followUpAnsweredAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  if (status === 'completed') {
    next.followUpStatus = 'completed';
    next.followUpDueAt = '';
  } else if (status === 'blocked') {
    next.followUpStatus = 'blocked';
    next.followUpDueAt = '';
  } else if (status === 'cancelled') {
    next.followUpStatus = 'cancelled';
    next.followUpDueAt = '';
  } else if ((Number(session.followUpReminderCount) || 0) < COACH_FOLLOWUP_MAX_REMINDERS) {
    next.followUpStatus = 'pending';
    next.followUpDueAt = new Date(now.getTime() + COACH_FOLLOWUP_DELAY_MS).toISOString();
  } else {
    next.followUpStatus = 'awaiting_response';
    next.followUpDueAt = '';
  }
  return next;
}

export function markCoachFollowupSent(session, now = new Date()) {
  return {
    ...session,
    followUpStatus: 'awaiting_response',
    followUpReminderCount: (Number(session.followUpReminderCount) || 0) + 1,
    followUpLastSentAt: now.toISOString(),
    followUpDueAt: '',
    updatedAt: now.toISOString(),
  };
}
