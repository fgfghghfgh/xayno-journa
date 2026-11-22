import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareUrgentEntryReview } from './coach-urgent-entry.mjs';

function pnl(trade) {
  return trade.result === 'loss' ? -Math.abs(trade.amount) : Math.abs(trade.amount);
}

test('requires only the three urgent-entry answers and trims their content', () => {
  assert.equal(prepareUrgentEntryReview({ why: 'عجله', stopLoss: '', similar: 'مطمئن نیستم' }, [], pnl), null);
  const result = prepareUrgentEntryReview({
    why: '  دلیل  ',
    stopLoss: 'حد ضرر مشخص',
    similar: 'شبیه معامله قبلی نیست',
    setup: '',
    emotion: '',
  }, [], pnl);
  assert.deepEqual(result, {
    answers: { why: 'دلیل', stopLoss: 'حد ضرر مشخص', similar: 'شبیه معامله قبلی نیست' },
    examples: [],
  });
});

test('provides only closed losing examples with dates and bounded evidence', () => {
  const trades = [
    { token: 'A', status: 'closed', closedAt: '2026-11-18', result: 'loss', amount: 10, mistakes: 'FOMO' },
    { token: 'B', status: 'closed', closedAt: '2026-11-21', result: 'loss', amount: 5, entryReason: 'شتاب' },
    { token: 'WIN', status: 'closed', closedAt: '2026-11-22', result: 'win', amount: 6 },
    { token: 'OPEN', status: 'open', closedAt: '2026-11-23', result: 'loss', amount: 4 },
  ];
  const result = prepareUrgentEntryReview({
    why: 'FOMO', stopLoss: 'ندارم', similar: 'شاید A',
  }, trades, pnl, 1);
  assert.deepEqual(result.examples, [{
    token: 'B',
    date: '2026-11-21',
    pnlDollar: -5,
    setup: '',
    emotion: '',
    mistakes: '',
    entryReason: 'شتاب',
    stopLoss: '',
  }]);
});

test('caps evidence at eight trades and answer text at one thousand characters', () => {
  const trades = Array.from({ length: 12 }, (_, index) => ({
    id: `trade-${index}`,
    status: 'closed',
    closedAt: `2026-11-${String(index + 1).padStart(2, '0')}`,
    result: 'loss',
    amount: index + 1,
  }));
  const result = prepareUrgentEntryReview({
    why: 'x'.repeat(1200), stopLoss: 'حد ضرر', similar: 'معامله مشابه',
  }, trades, pnl);
  assert.equal(result.answers.why.length, 1000);
  assert.equal(result.examples.length, 8);
});
