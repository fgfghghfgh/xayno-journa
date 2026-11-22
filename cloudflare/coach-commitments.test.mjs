import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCoachCommitmentTasks,
  getAdaptiveCoachTone,
  summarizeCoachCommitments,
} from './coach-commitments.mjs';

test('tracks accepted commitments and homework once, preserving task status', () => {
  const tasks = buildCoachCommitmentTasks({
    id: 'session-123',
    createdAt: '2026-04-10T00:00:00.000Z',
    commitments: ['بعد از دو ضرر استراحت می‌کنم', ' تمرین مکث '],
    homework: 'تمرین   مکث',
  }, [{ id: 'existing', text: 'بعد از دو ضرر استراحت می‌کنم', status: 'completed' }]);

  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].id, 'existing');
  assert.equal(tasks[0].status, 'completed');
  assert.equal(tasks[1].source, 'commitment');
});

test('keeps blocked, completed, and cancelled task statuses distinct for coach context', () => {
  const tasks = buildCoachCommitmentTasks({
    commitments: ['قول الف', 'قول ب', 'قول ج'],
  }, [
    { id: 'a', text: 'قول الف', status: 'blocked' },
    { id: 'b', text: 'قول ب', status: 'completed' },
    { id: 'c', text: 'قول ج', status: 'cancelled' },
  ]);
  assert.deepEqual(tasks.map((task) => task.status), ['blocked', 'completed', 'cancelled']);
});

test('scores completed accepted tasks for all time and the last 30 days only', () => {
  const now = Date.parse('2026-04-30T00:00:00.000Z');
  const result = summarizeCoachCommitments([
    {
      id: 'recent',
      createdAt: '2026-04-20T00:00:00.000Z',
      commitmentTasks: [
        { id: 'task-1', text: 'تمرین یک', status: 'completed' },
        { id: 'task-2', text: 'تمرین دو', status: 'pending' },
        { id: 'task-3', text: 'قول لغوشده', status: 'cancelled' },
      ],
    },
    {
      id: 'old',
      createdAt: '2026-03-01T00:00:00.000Z',
      commitmentTasks: [{ id: 'task-1', text: 'قول قدیمی', status: 'completed' }],
    },
  ], now);

  assert.deepEqual(result.allTime, { total: 3, completed: 2, score: 67 });
  assert.deepEqual(result.last30Days, { total: 2, completed: 1, score: 50 });
});

test('uses follow-up status for legacy sessions and returns no score without tasks', () => {
  const result = summarizeCoachCommitments([
    {
      id: 'legacy-session',
      createdAt: '2026-04-15T00:00:00.000Z',
      commitments: ['قول واحد'],
      homework: 'قول واحد',
      followUpStatus: 'completed',
    },
  ], Date.parse('2026-04-30T00:00:00.000Z'));

  assert.deepEqual(result.allTime, { total: 1, completed: 1, score: 100 });
  assert.deepEqual(summarizeCoachCommitments([], Date.now()).allTime, { total: 0, completed: 0, score: null });
});

test('adapts coaching tone from recent evaluated commitments, not blocked or fresh tasks', () => {
  const now = Date.parse('2026-04-30T00:00:00.000Z');
  const sessions = [
    { id: 'done-a', createdAt: '2026-04-27T00:00:00.000Z', commitmentTasks: [{ text: 'a', status: 'completed' }] },
    { id: 'done-b', createdAt: '2026-04-26T00:00:00.000Z', commitmentTasks: [{ text: 'b', status: 'completed' }] },
    { id: 'late-a', createdAt: '2026-04-25T00:00:00.000Z', followUpDueAt: '2026-04-26T00:00:00.000Z', commitmentTasks: [{ text: 'c', status: 'pending' }] },
    { id: 'late-b', createdAt: '2026-04-24T00:00:00.000Z', followUpDueAt: '2026-04-25T00:00:00.000Z', commitmentTasks: [{ text: 'd', status: 'pending' }] },
    { id: 'blocked', createdAt: '2026-04-23T00:00:00.000Z', commitmentTasks: [{ text: 'e', status: 'blocked' }] },
    { id: 'fresh', createdAt: '2026-04-29T00:00:00.000Z', followUpDueAt: '2026-05-01T00:00:00.000Z', commitmentTasks: [{ text: 'f', status: 'pending' }] },
  ];
  assert.deepEqual(getAdaptiveCoachTone(sessions, now), {
    mode: 'direct',
    sampleSize: 4,
    completed: 2,
    overdue: 2,
    blocked: 1,
    completionRate: 50,
  });
});

test('keeps tone supportive with insufficient evidence and gets firmer after repeated overdue tasks', () => {
  const now = Date.parse('2026-04-30T00:00:00.000Z');
  const makeSession = (id, day, status, dueDay = day) => ({
    id,
    createdAt: `2026-04-${String(day).padStart(2, '0')}T00:00:00.000Z`,
    followUpDueAt: `2026-04-${String(dueDay).padStart(2, '0')}T00:00:00.000Z`,
    commitmentTasks: [{ text: id, status }],
  });
  assert.equal(getAdaptiveCoachTone([
    makeSession('done', 28, 'completed'),
    makeSession('late', 27, 'pending', 28),
  ], now).mode, 'supportive');
  assert.equal(getAdaptiveCoachTone([
    makeSession('done', 28, 'completed'),
    makeSession('late-a', 27, 'pending', 28),
    makeSession('late-b', 26, 'pending', 27),
    makeSession('late-c', 25, 'pending', 26),
  ], now).mode, 'direct');
  assert.equal(getAdaptiveCoachTone([
    makeSession('done-a', 28, 'completed'),
    makeSession('done-b', 27, 'completed'),
    makeSession('late', 26, 'pending', 27),
  ], now).mode, 'balanced');
  assert.equal(getAdaptiveCoachTone([
    makeSession('done-a', 28, 'completed'),
    makeSession('done-b', 27, 'completed'),
    makeSession('done-c', 26, 'completed'),
  ], now).mode, 'supportive');
});
