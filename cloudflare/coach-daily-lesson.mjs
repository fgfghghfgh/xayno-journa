import { normalizeCoachPattern } from './coach-trade-feedback.mjs';

const STOP_WORDS = new Set([
  'از', 'به', 'با', 'در', 'را', 'که', 'چی', 'چه', 'چرا', 'چطور', 'من', 'تو',
  'این', 'آن', 'هم', 'برای', 'یک', 'می', 'های', 'هام', 'است', 'بود', 'شد',
]);

function dateKeyInTehran(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`;
}

function tradeDateKey(trade) {
  const journalDate = String(trade?.journalDate || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(journalDate)) return journalDate;
  return dateKeyInTehran(trade?.openedAt || trade?.createdAt);
}

function words(value) {
  return new Set(normalizeCoachPattern(value).split(' ')
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word)));
}

export function getTehranDateKey(value = new Date()) {
  return dateKeyInTehran(value);
}

export function selectDailyLessonTrades(trades, dateKey = getTehranDateKey(), limit = 30) {
  if (!Array.isArray(trades)) throw new TypeError('Trades must be an array.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) throw new TypeError('A valid Tehran date key is required.');
  const maxTrades = Math.max(1, Math.min(100, Number(limit) || 30));
  const todaysTrades = trades
    .filter((trade) => tradeDateKey(trade) === dateKey)
    .sort((left, right) => String(right.openedAt || right.createdAt || '').localeCompare(String(left.openedAt || left.createdAt || '')));
  return {
    totalCount: todaysTrades.length,
    trades: todaysTrades.slice(0, maxTrades),
  };
}

export function selectRelevantLessonNotes(trades, lessons, limit = 2) {
  if (!Array.isArray(trades) || !Array.isArray(lessons)) {
    throw new TypeError('Trades and lessons must be arrays.');
  }
  const maxLessons = Math.max(1, Math.min(2, Number(limit) || 2));
  const tradeWords = new Set(trades.flatMap((trade) => [
    trade?.token, trade?.setup, trade?.emotion, trade?.mistakes, trade?.lesson,
    trade?.entryReason, trade?.exitReason, trade?.notes, trade?.riskLevel,
  ].flatMap((value) => [...words(value)])));
  if (!tradeWords.size) return [];

  return lessons.map((lesson, index) => {
    const noteWords = new Set([
      lesson?.book,
      lesson?.text,
      ...(Array.isArray(lesson?.tags) ? lesson.tags : []),
    ].flatMap((value) => [...words(value)]));
    const score = [...noteWords].reduce((total, word) => total + Number(tradeWords.has(word)), 0);
    return { lesson, index, score };
  })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, maxLessons)
    .map(({ lesson }) => ({
      id: String(lesson.id || '').slice(0, 170),
      book: String(lesson.book || '').slice(0, 160),
      text: String(lesson.text || '').slice(0, 1200),
      tags: Array.isArray(lesson.tags) ? lesson.tags.slice(0, 12) : [],
    }));
}
