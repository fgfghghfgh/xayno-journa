import assert from 'node:assert/strict';
import test from 'node:test';
import { isExpandedCoachRequest, selectRelevantCoachTrades } from './coach-chat-context.mjs';

const trades = [
  { id: 'recent', token: 'SOL', status: 'closed', closedAt: '2026-11-23', emotion: 'آرامش', notes: 'ثبت امروز' },
  { id: 'fomo-1', token: 'BONK', status: 'closed', closedAt: '2026-11-18', emotion: 'فومو ورود عجولانه', mistakes: 'ورود از ترس جا ماندن' },
  { id: 'old', token: 'BTC', status: 'closed', closedAt: '2026-10-10', setup: 'شکست مقاومت' },
  { id: 'fomo-2', token: 'PEPE', status: 'closed', closedAt: '2026-11-20', emotion: 'فومو بعد از پامپ', mistakes: 'ورود عجولانه' },
];

test('selects relevant trades and a small recent baseline without exposing images', () => {
  const result = selectRelevantCoachTrades('چرا فومو و ورود عجولانه تکرار شد؟', trades);
  assert.ok(result.length <= 8);
  assert.ok(result.some((trade) => trade.id === 'fomo-1'));
  assert.ok(result.some((trade) => trade.id === 'fomo-2'));
  assert.ok(result.some((trade) => trade.id === 'recent'));
  assert.equal(Object.hasOwn(result[0], 'images'), false);
});

test('bounds even vague chat context to recent trades', () => {
  const manyTrades = Array.from({ length: 10 }, (_, index) => ({
    id: `recent-${index}`,
    status: 'closed',
    closedAt: `2026-11-${String(index + 1).padStart(2, '0')}`,
  }));
  const result = selectRelevantCoachTrades('سلام', manyTrades);
  assert.deepEqual(result.map((trade) => trade.id), ['recent-9', 'recent-8', 'recent-7']);
});

test('expands context only for explicit full journal, report, or chart requests', () => {
  assert.equal(isExpandedCoachRequest('سلام استاد'), false);
  assert.equal(isExpandedCoachRequest('چرا عجله کردم؟'), false);
  assert.equal(isExpandedCoachRequest('یک تحلیل کامل از همه معاملاتم بده'), true);
  assert.equal(isExpandedCoachRequest('این عکس چارت را تحلیل کن'), true);
});

test('caps trade fields and limits selected records', () => {
  const manyTrades = Array.from({ length: 30 }, (_, index) => ({
    id: `trade-${index}`,
    status: 'closed',
    closedAt: `2026-11-${String((index % 28) + 1).padStart(2, '0')}`,
    notes: 'x'.repeat(1000),
    image: 'data:image/png;base64,private',
  }));
  const result = selectRelevantCoachTrades('بدون ارتباط', manyTrades, { maxTrades: 4, recentCount: 2 });
  assert.equal(result.length, 2);
  assert.ok(result.every((trade) => trade.notes.length <= 160));
  assert.equal(Object.hasOwn(result[0], 'image'), false);
});

test('normalizes trade results using the journal PnL calculation when provided', () => {
  const result = selectRelevantCoachTrades('فومو', [{
    id: 'loss',
    status: 'closed',
    pnlDollar: '15',
    pnlOutcome: 'loss',
    mistakes: 'فومو ورود',
  }], { getPnl: () => -15 });
  assert.equal(result[0].pnlDollar, -15);
  assert.equal(result[0].pnlOutcome, 'loss');
});
