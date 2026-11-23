import { coachPatternMatches } from './coach-trade-feedback.mjs';

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

function partsMap(formatter, date) {
  return Object.fromEntries(formatter.formatToParts(date)
    .filter((part) => part.type !== 'literal')
    .map(({ type, value }) => [type, value]));
}

function tradeDateTime(value) {
  const raw = String(value || '').trim();
  const local = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?$/);
  if (local) return { date: local[1], hour: Number(local[2]) };
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = partsMap(DATE_TIME_FORMAT, date);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

function groupLossesByField(hourTrades, getPnl) {
  const patterns = [];
  for (const [field, label] of [['emotion', 'حالت ذهنی'], ['mistakes', 'اشتباه ثبت‌شده']]) {
    const losses = hourTrades.filter((trade) => trade.status === 'closed'
      && Number(getPnl(trade)) < 0
      && String(trade[field] || '').trim());
    for (const trade of losses) {
      const phrase = String(trade[field]).trim().replace(/\s+/g, ' ').slice(0, 240);
      const matches = losses.filter((candidate) => coachPatternMatches(phrase, candidate[field]));
      if (matches.length < 2) continue;
      const existing = patterns.find((item) => item.field === field
        && coachPatternMatches(item.phrase, phrase));
      if (existing) continue;
      patterns.push({ field, label, phrase, matches });
    }
  }
  return patterns;
}

export function buildWeakMomentForecast(trades, getPnl, now = new Date()) {
  if (!Array.isArray(trades) || typeof getPnl !== 'function') {
    throw new TypeError('Trades and a PnL function are required to build a weak-moment forecast.');
  }
  const currentDate = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(currentDate.getTime())) throw new TypeError('A valid forecast date is required.');
  const currentParts = partsMap(DATE_TIME_FORMAT, currentDate);
  const currentDateKey = `${currentParts.year}-${currentParts.month}-${currentParts.day}`;
  const currentHour = Number(currentParts.hour);
  const today = Date.UTC(Number(currentParts.year), Number(currentParts.month) - 1, Number(currentParts.day));
  const datedTrades = trades.map((trade) => ({
    trade,
    dateTime: tradeDateTime(trade.openedAt || trade.entryTime),
  })).filter(({ trade, dateTime }) => {
    if (!dateTime || !Number.isInteger(dateTime.hour) || dateTime.hour < 0 || dateTime.hour > 23) return false;
    const day = Date.parse(`${dateTime.date}T00:00:00Z`);
    const ageDays = (today - day) / 86_400_000;
    return Number.isFinite(day) && ageDays >= 0 && ageDays <= 90 && trade.status === 'closed';
  });
  const hourGroups = new Map();
  for (const item of datedTrades) {
    const hour = item.dateTime.hour;
    if (!hourGroups.has(hour)) hourGroups.set(hour, []);
    hourGroups.get(hour).push(item.trade);
  }

  const patterns = [];
  for (const [hour, hourTrades] of hourGroups) {
    for (const pattern of groupLossesByField(hourTrades, getPnl)) {
      patterns.push({
        hour,
        field: pattern.label,
        phrase: pattern.phrase,
        lossCount: pattern.matches.length,
        examples: pattern.matches
          .sort((left, right) => String(right.openedAt || '').localeCompare(String(left.openedAt || '')))
          .slice(0, 3)
          .map((trade) => ({
            date: tradeDateTime(trade.openedAt || trade.entryTime)?.date || '',
            token: String(trade.token || '').slice(0, 80),
            emotion: String(trade.emotion || '').slice(0, 160),
            mistake: String(trade.mistakes || '').slice(0, 200),
          })),
      });
    }
  }
  patterns.sort((left, right) => left.hour - right.hour
    || right.lossCount - left.lossCount
    || left.field.localeCompare(right.field));
  const currentPatterns = patterns.filter((pattern) => pattern.hour === currentHour);
  const upcomingPatterns = patterns
    .filter((pattern) => pattern.hour > currentHour)
    .sort((left, right) => left.hour - right.hour || right.lossCount - left.lossCount);
  const relevantPatterns = currentPatterns.length
    ? currentPatterns
    : upcomingPatterns.length
      ? patterns.filter((pattern) => pattern.hour === upcomingPatterns[0].hour)
      : [];
  return {
    currentDate: currentDateKey,
    currentHour,
    tradeCount: trades.length,
    belowMinimumTradeCount: trades.length < 30,
    activeNow: currentPatterns.length > 0,
    alertHour: relevantPatterns.length ? relevantPatterns[0].hour : null,
    alertIsUpcoming: currentPatterns.length === 0 && relevantPatterns.length > 0,
    patterns: relevantPatterns.slice(0, 3),
  };
}
