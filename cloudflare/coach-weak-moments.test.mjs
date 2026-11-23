import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWeakMomentForecast } from './coach-weak-moments.mjs';

const pnl = (trade) => trade.outcome === 'loss' ? -1 : 1;

test('flags a current Tehran hour only with repeated recorded losses and similar states', () => {
  const trades = [
    { id: 'a', status: 'closed', openedAt: '2026-11-23T09:10', emotion: 'ترس از جا ماندن', outcome: 'loss', token: 'A' },
    { id: 'b', status: 'closed', openedAt: '2026-11-22T09:50', emotion: 'ترس از جا ماندن و عجله', outcome: 'loss', token: 'B' },
    { id: 'c', status: 'closed', openedAt: '2026-11-22T09:20', emotion: 'آرام و صبور', outcome: 'win', token: 'C' },
  ];
  const result = buildWeakMomentForecast(trades, pnl, new Date('2026-11-23T05:30:00.000Z'));
  assert.equal(result.currentHour, 9);
  assert.equal(result.activeNow, true);
  assert.equal(result.alertHour, 9);
  assert.equal(result.belowMinimumTradeCount, true);
  assert.equal(result.patterns[0].lossCount, 2);
  assert.deepEqual(result.patterns[0].examples.map((item) => item.token), ['A', 'B']);
});

test('shows the next observed sensitive hour before it occurs', () => {
  const trades = [
    { id: 'a', status: 'closed', openedAt: '2026-11-23T11:10', mistakes: 'ورود عجولانه بعد از فومو', outcome: 'loss' },
    { id: 'b', status: 'closed', openedAt: '2026-11-22T11:50', mistakes: 'ورود عجولانه بعد فومو', outcome: 'loss' },
  ];
  const result = buildWeakMomentForecast(trades, pnl, new Date('2026-11-23T05:30:00.000Z'));
  assert.equal(result.activeNow, false);
  assert.equal(result.alertIsUpcoming, true);
  assert.equal(result.alertHour, 11);
});

test('does not make patterns from one loss, dissimilar states, missing entry time, or old trades', () => {
  const trades = [
    { status: 'closed', openedAt: '2026-11-23T09:10', emotion: 'ترس از جا ماندن', outcome: 'loss' },
    { status: 'closed', openedAt: '2026-11-22T09:50', emotion: 'آرام و صبور', outcome: 'loss' },
    { status: 'closed', journalDate: '2026-11-23', emotion: 'ترس از جا ماندن', outcome: 'loss' },
    { status: 'closed', openedAt: 'not a valid time', emotion: 'ترس از جا ماندن', outcome: 'loss' },
    { status: 'closed', openedAt: '2026-01-01T09:20', emotion: 'ترس از جا ماندن', outcome: 'loss' },
  ];
  const result = buildWeakMomentForecast(trades, pnl, new Date('2026-11-23T05:30:00.000Z'));
  assert.equal(result.patterns.length, 0);
  assert.equal(result.activeNow, false);
});

test('marks fewer than thirty journal trades as sparse, but not thirty', () => {
  const belowThreshold = buildWeakMomentForecast(
    Array.from({ length: 29 }, () => ({ status: 'open' })),
    pnl,
    new Date('2026-11-23T05:30:00.000Z'),
  );
  const atThreshold = buildWeakMomentForecast(
    Array.from({ length: 30 }, () => ({ status: 'open' })),
    pnl,
    new Date('2026-11-23T05:30:00.000Z'),
  );
  assert.equal(belowThreshold.belowMinimumTradeCount, true);
  assert.equal(atThreshold.belowMinimumTradeCount, false);
});

test('validates inputs and ignores open trades', () => {
  assert.throws(() => buildWeakMomentForecast({}, pnl), /Trades/);
  assert.throws(() => buildWeakMomentForecast([], pnl, 'not a date'), /valid forecast date/);
  const result = buildWeakMomentForecast([
    { status: 'open', openedAt: '2026-11-23T09:10', emotion: 'ترس از جا ماندن', outcome: 'loss' },
    { status: 'open', openedAt: '2026-11-22T09:50', emotion: 'ترس از جا ماندن', outcome: 'loss' },
  ], pnl, new Date('2026-11-23T05:30:00.000Z'));
  assert.equal(result.patterns.length, 0);
});
