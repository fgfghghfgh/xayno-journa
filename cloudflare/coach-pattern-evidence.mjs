import { coachPatternMatches, normalizeCoachPattern } from './coach-trade-feedback.mjs';

const PATTERN_FIELDS = [
  ['mistakes', 'اشتباه ثبت‌شده'],
  ['emotion', 'حالت ذهنی'],
  ['entryReason', 'دلیل ورود'],
  ['setup', 'ستاپ'],
];

function tradeDate(trade) {
  return String(trade.closedAt || trade.openedAt || trade.journalDate || trade.createdAt || '').slice(0, 40);
}

export function buildRepeatedLossEvidence(trades, getPnl, options = {}) {
  if (!Array.isArray(trades) || typeof getPnl !== 'function') {
    throw new TypeError('Trades and a PnL function are required to build coach evidence.');
  }
  const maxPatterns = Math.max(1, Math.min(8, Number(options.maxPatterns) || 5));
  const maxExamples = Math.max(2, Math.min(5, Number(options.maxExamples) || 3));
  const tradeCount = Math.max(trades.length, Number(options.totalTradeCount) || 0);
  const losses = trades.filter((trade) => trade?.status === 'closed' && Number(getPnl(trade)) < 0)
    .sort((left, right) => tradeDate(right).localeCompare(tradeDate(left)));
  const patterns = [];

  for (const [key, label] of PATTERN_FIELDS) {
    for (const trade of losses) {
      const description = String(trade[key] || '').trim().replace(/\s+/g, ' ').slice(0, 240);
      if (!description) continue;
      const matching = losses.filter((candidate) => coachPatternMatches(description, candidate[key]));
      if (matching.length < 2) continue;
      const normalized = normalizeCoachPattern(description);
      let pattern = patterns.find((item) => item.field === label
        && (normalizeCoachPattern(item.description) === normalized
          || coachPatternMatches(item.description, description)));
      if (!pattern) {
        pattern = { field: label, description, examples: [] };
        patterns.push(pattern);
      }
      for (const example of matching) {
        if (pattern.examples.some((item) => item.tradeId === String(example.id || ''))) continue;
        const pnl = Number(getPnl(example));
        const reportedPercent = Number(example.pnlPercent);
        pattern.examples.push({
          tradeId: String(example.id || '').slice(0, 80),
          token: String(example.token || '').slice(0, 80),
          date: tradeDate(example),
          outcome: 'loss',
          pnlDollar: Number.isFinite(pnl) ? Math.round(pnl * 100) / 100 : null,
          pnlPercent: example.pnlPercent !== '' && example.pnlPercent != null && Number.isFinite(reportedPercent)
            ? reportedPercent
            : null,
        });
      }
    }
  }

  return {
    tradeCount,
    belowMinimumTradeCount: tradeCount < 30,
    patterns: patterns.slice(0, maxPatterns).map((pattern) => ({
      ...pattern,
      examples: pattern.examples.sort((left, right) => right.date.localeCompare(left.date)).slice(0, maxExamples),
    })),
  };
}
