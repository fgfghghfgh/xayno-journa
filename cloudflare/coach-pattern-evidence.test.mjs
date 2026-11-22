import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRepeatedLossEvidence } from './coach-pattern-evidence.mjs';
import { coachPatternMatches } from './coach-trade-feedback.mjs';

function pnl(trade) {
  return trade.outcome === 'loss' ? -Math.abs(Number(trade.pnlDollar) || 1) : Math.abs(Number(trade.pnlDollar) || 1);
}

test('supplies dated trade examples and explicit results for repeated losing mistakes', () => {
  const trades = [
    { id: 'loss-1', token: 'SOL', status: 'closed', closedAt: '2026-11-18', mistakes: 'ورود عجولانه بعد از فومو', outcome: 'loss', pnlDollar: 12 },
    { id: 'loss-2', token: 'BONK', status: 'closed', closedAt: '2026-11-21', mistakes: 'فومو، ورود عجولانه', outcome: 'loss', pnlDollar: 8, pnlPercent: 20 },
    { id: 'win-1', token: 'ETH', status: 'closed', closedAt: '2026-11-22', mistakes: 'ورود عجولانه بعد از فومو', outcome: 'win', pnlDollar: 5 },
  ];

  const result = buildRepeatedLossEvidence(trades, pnl);
  assert.equal(result.tradeCount, 3);
  assert.equal(result.belowMinimumTradeCount, true);
  assert.equal(result.patterns.length, 1);
  assert.equal(result.patterns[0].field, 'اشتباه ثبت‌شده');
  assert.deepEqual(result.patterns[0].examples.map(({ token, date, outcome, pnlDollar }) => ({
    token, date, outcome, pnlDollar,
  })), [
    { token: 'BONK', date: '2026-11-21', outcome: 'loss', pnlDollar: -8 },
    { token: 'SOL', date: '2026-11-18', outcome: 'loss', pnlDollar: -12 },
  ]);
});

test('does not present a single trade or an open trade as a repeated loss', () => {
  const trades = [
    { id: 'loss', status: 'closed', mistakes: 'ورود عجولانه بعد از فومو', outcome: 'loss' },
    { id: 'open', status: 'open', mistakes: 'ورود عجولانه بعد از فومو', outcome: 'loss' },
  ];
  assert.deepEqual(buildRepeatedLossEvidence(trades, pnl).patterns, []);
});

test('uses the full journal count for the thirty-trade minimum', () => {
  const sample = [{ id: 'recent', status: 'closed', mistakes: 'ورود عجولانه بعد از فومو', outcome: 'loss' }];
  assert.equal(buildRepeatedLossEvidence(sample, pnl, { totalTradeCount: 29 }).belowMinimumTradeCount, true);
  assert.equal(buildRepeatedLossEvidence(sample, pnl, { totalTradeCount: 30 }).belowMinimumTradeCount, false);
});

test('keeps only a bounded number of evidence examples and patterns', () => {
  const trades = Array.from({ length: 10 }, (_, index) => ({
    id: `loss-${index}`,
    status: 'closed',
    closedAt: `2026-11-${String(index + 1).padStart(2, '0')}`,
    mistakes: 'ورود عجولانه بعد از فومو',
    emotion: 'ترس از جا ماندن',
    entryReason: 'ورود عجولانه بعد از فومو',
    setup: 'ورود عجولانه بعد از فومو',
    outcome: 'loss',
  }));
  const result = buildRepeatedLossEvidence(trades, pnl, { maxPatterns: 2, maxExamples: 2 });
  assert.equal(result.patterns.length, 2);
  assert.ok(result.patterns.every((pattern) => pattern.examples.length === 2));
  assert.equal(coachPatternMatches(result.patterns[0].description, trades[0].mistakes), true);
});
