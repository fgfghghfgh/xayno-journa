const REPORT_FIELDS = [
  'id', 'updatedAt', 'status', 'date', 'token', 'pnlDollar', 'pnlPercent', 'pnlOutcome',
  'investAmount', 'setup', 'emotion', 'mistakes', 'lesson', 'entryReason', 'exitReason',
  'riskLevel', 'stopLoss',
];

const TEHRAN_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dateKeyInTehran(value) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = Object.fromEntries(TEHRAN_DATE_FORMAT.formatToParts(date)
    .filter((part) => part.type !== 'literal')
    .map(({ type, value: partValue }) => [type, partValue]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function tradeDate(trade) {
  return dateKeyInTehran(trade?.journalDate || trade?.openedAt || trade?.createdAt);
}

function mondayForDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day));
  const weekday = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - weekday);
  return monday;
}

export function buildWeeklyReportInput(trades, now = new Date()) {
  if (!Array.isArray(trades)) throw new TypeError('Trades must be an array.');
  const currentDate = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(currentDate.getTime())) throw new TypeError('A valid report date is required.');

  const currentDateKey = dateKeyInTehran(currentDate.toISOString());
  const start = mondayForDateKey(currentDateKey);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekStart = start.toISOString().slice(0, 10);
  const weekEnd = end.toISOString().slice(0, 10);
  const journal = trades.map((trade) => ({
    id: String(trade.id || '').slice(0, 80),
    updatedAt: String(trade.updatedAt || '').slice(0, 40),
    status: String(trade.status || '').slice(0, 20),
    date: tradeDate(trade),
    token: String(trade.token || '').slice(0, 80),
    pnlDollar: trade.pnlDollar ?? '',
    pnlPercent: trade.pnlPercent ?? '',
    pnlOutcome: String(trade.pnlOutcome || '').slice(0, 20),
    investAmount: trade.investAmount ?? '',
    setup: String(trade.setup || '').slice(0, 160),
    emotion: String(trade.emotion || '').slice(0, 240),
    mistakes: String(trade.mistakes || '').slice(0, 300),
    lesson: String(trade.lesson || '').slice(0, 300),
    entryReason: String(trade.entryReason || '').slice(0, 300),
    exitReason: String(trade.exitReason || '').slice(0, 300),
    riskLevel: String(trade.riskLevel || '').slice(0, 40),
    stopLoss: String(trade.stopLoss || '').slice(0, 80),
  })).sort((left, right) => left.id.localeCompare(right.id));
  const weekTrades = journal.filter((trade) => {
    return trade.date >= weekStart && trade.date < weekEnd;
  }).sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
  const fingerprintData = JSON.stringify({
    tradeCount: trades.length,
    journal: journal.map((trade) => REPORT_FIELDS.map((field) => trade[field])),
  });

  return { weekStart, weekEnd: weekEnd, tradeCount: trades.length, weekTrades, fingerprintData };
}
