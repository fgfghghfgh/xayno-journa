export function createAutonomousCoachSignal(now = new Date(), lastSentAt = '') {
  const timestamp = new Date(now).getTime();
  if (!Number.isFinite(timestamp)) throw new TypeError('A valid current date is required.');
  const hourStart = Math.floor(timestamp / 3_600_000) * 3_600_000;
  return {
    type: 'autonomous_review',
    key: `autonomous_review:${hourStart}`,
    evidence: {
      checkedAt: new Date(timestamp).toISOString(),
      lastSentAt: String(lastSentAt || '').slice(0, 40),
    },
  };
}
