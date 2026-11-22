export function prepareUrgentEntryReview(answers, trades, getPnl, maxExamples = 8) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) || !Array.isArray(trades)
    || typeof getPnl !== 'function') {
    throw new TypeError('Urgent-entry answers, trades, and a PnL function are required.');
  }
  const safeAnswers = Object.fromEntries(['why', 'stopLoss', 'similar'].map((field) => [
    field,
    String(answers[field] || '').trim().slice(0, 1000),
  ]));
  if (Object.values(safeAnswers).some((value) => !value)) return null;

  const limit = Math.max(1, Math.min(8, Number(maxExamples) || 8));
  const examples = trades
    .filter((trade) => trade?.status === 'closed' && Number(getPnl(trade)) < 0)
    .sort((left, right) => String(right.closedAt || right.openedAt || right.journalDate || '')
      .localeCompare(String(left.closedAt || left.openedAt || left.journalDate || '')))
    .slice(0, limit)
    .map((trade) => ({
      token: String(trade.token || '').slice(0, 80),
      date: String(trade.closedAt || trade.openedAt || trade.journalDate || '').slice(0, 40),
      pnlDollar: Math.round(Number(getPnl(trade)) * 100) / 100,
      setup: String(trade.setup || '').slice(0, 160),
      emotion: String(trade.emotion || '').slice(0, 240),
      mistakes: String(trade.mistakes || '').slice(0, 300),
      entryReason: String(trade.entryReason || '').slice(0, 300),
      stopLoss: String(trade.stopLoss || '').slice(0, 80),
    }));

  return { answers: safeAnswers, examples };
}
