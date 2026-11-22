import assert from 'node:assert/strict';
import test from 'node:test';
import { createAutonomousCoachSignal } from './coach-autonomy.mjs';

test('creates a stable autonomous review opportunity within an hour', () => {
  const first = createAutonomousCoachSignal('2026-11-23T09:05:00Z', '2026-11-23T08:00:00Z');
  const later = createAutonomousCoachSignal('2026-11-23T09:55:00Z', '2026-11-23T08:00:00Z');
  assert.equal(first.key, later.key);
  assert.equal(first.type, 'autonomous_review');
  assert.equal(first.evidence.lastSentAt, '2026-11-23T08:00:00Z');
});

test('opens a new autonomous review opportunity in the next hour', () => {
  const first = createAutonomousCoachSignal('2026-11-23T09:59:59Z');
  const next = createAutonomousCoachSignal('2026-11-23T10:00:00Z');
  assert.notEqual(first.key, next.key);
});

test('rejects invalid scheduler timestamps', () => {
  assert.throws(() => createAutonomousCoachSignal('invalid'), { name: 'TypeError' });
});
