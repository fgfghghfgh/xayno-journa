import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWeeklyReportInput } from './coach-weekly-report.mjs';

test('uses Tehran Monday-to-Monday dates and includes the start but excludes the next week', () => {
  const result = buildWeeklyReportInput([
    { id: 'monday', journalDate: '2026-11-23', token: 'A' },
    { id: 'sunday', openedAt: '2026-11-29T19:00:00.000Z', token: 'B' },
    { id: 'next-monday', openedAt: '2026-11-29T20:30:00.000Z', token: 'C' },
    { id: 'last-week', journalDate: '2026-11-22', token: 'D' },
  ], new Date('2026-11-27T18:30:00.000Z'));

  assert.equal(result.weekStart, '2026-11-23');
  assert.equal(result.weekEnd, '2026-11-30');
  assert.deepEqual(result.weekTrades.map((trade) => trade.id), ['monday', 'sunday']);
});

test('creates a stable cache fingerprint and changes it when journal content changes', () => {
  const trades = [
    { id: 'b', journalDate: '2026-11-24', emotion: 'آرام' },
    { id: 'a', journalDate: '2026-11-24', emotion: 'عجول' },
  ];
  const first = buildWeeklyReportInput(trades, new Date('2026-11-24T00:00:00Z'));
  const reordered = buildWeeklyReportInput([...trades].reverse(), new Date('2026-11-24T00:00:00Z'));
  const edited = buildWeeklyReportInput([{ ...trades[0], emotion: 'آرام و صبور' }, trades[1]], new Date('2026-11-24T00:00:00Z'));
  assert.equal(first.fingerprintData, reordered.fingerprintData);
  assert.notEqual(first.fingerprintData, edited.fingerprintData);
});

test('rejects invalid report dates and non-array trade data', () => {
  assert.throws(() => buildWeeklyReportInput({}, new Date()), /array/);
  assert.throws(() => buildWeeklyReportInput([], 'not-a-date'), /valid report date/);
});
