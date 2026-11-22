import { normalizeCoachPattern } from './coach-trade-feedback.mjs';

const STOP_WORDS = new Set([
  'از', 'به', 'با', 'در', 'را', 'که', 'چی', 'چه', 'چرا', 'چطور', 'من', 'تو',
  'این', 'آن', 'هم', 'برای', 'یک', 'می', 'های', 'هام', 'آخر', 'اخیر',
]);

const TRADE_FIELDS = [
  'token', 'setup', 'emotion', 'mistakes', 'lesson', 'entryReason', 'exitReason',
  'notes', 'riskLevel', 'stopLoss',
];

export function isExpandedCoachRequest(message) {
  return /گزارش|تحلیل\s*(?:کامل|جامع|همه)|بررسی\s*(?:کامل|جامع)|همه\s+معامله|تمام\s+معامله|کل\s+ژورنال|چارت|نمودار|عکس|تصویر|کندل|تکنیکال|ماهانه|ماه(?:\s|$)|هفتگی|هفته(?:\s|$)|chart|image|screenshot/i
    .test(String(message || ''));
}

function wordSet(value) {
  return new Set(normalizeCoachPattern(value).split(' ')
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)));
}

function tradeDate(trade) {
  return String(trade?.closedAt || trade?.openedAt || trade?.journalDate || trade?.createdAt || '').slice(0, 40);
}

export function selectRelevantCoachTrades(message, trades, options = {}) {
  if (!Array.isArray(trades)) throw new TypeError('Trades must be an array.');
  const maxTrades = Math.max(1, Math.min(12, Number(options.maxTrades) || 8));
  const recentCount = Math.max(0, Math.min(maxTrades, Number(options.recentCount) || 3));
  const queryWords = wordSet(message);
  const ranked = trades.map((trade, index) => {
    const text = TRADE_FIELDS.map((field) => trade?.[field]).join(' ');
    const tradeWords = wordSet(text);
    const score = [...queryWords].reduce((sum, word) => sum + Number(tradeWords.has(word)), 0);
    return { trade, index, score, date: tradeDate(trade) };
  });
  const selected = new Set();
  for (const item of ranked.slice().sort((left, right) => right.date.localeCompare(left.date)).slice(0, recentCount)) {
    selected.add(item.index);
  }
  for (const item of ranked.filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || right.date.localeCompare(left.date))) {
    if (selected.size >= maxTrades) break;
    selected.add(item.index);
  }
  return ranked.filter((item) => selected.has(item.index))
    .sort((left, right) => right.date.localeCompare(left.date))
    .map(({ trade }) => {
      const pnl = typeof options.getPnl === 'function' ? Number(options.getPnl(trade)) : Number(trade.pnlDollar);
      return {
        id: String(trade.id || '').slice(0, 80),
        token: String(trade.token || '').slice(0, 80),
        status: String(trade.status || '').slice(0, 20),
        date: tradeDate(trade),
        pnlDollar: Number.isFinite(pnl) ? pnl : '',
        pnlPercent: trade.pnlPercent ?? '',
        pnlOutcome: trade.status === 'closed' && Number.isFinite(pnl)
          ? (pnl < 0 ? 'loss' : pnl > 0 ? 'win' : 'breakeven')
          : String(trade.pnlOutcome || '').slice(0, 20),
        ...Object.fromEntries(TRADE_FIELDS.slice(1).map((field) => [
          field,
          String(trade[field] || '').slice(0, field === 'notes' ? 160 : 240),
        ])),
      };
    });
}
