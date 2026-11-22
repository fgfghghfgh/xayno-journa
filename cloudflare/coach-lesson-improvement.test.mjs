import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareLessonImprovementContext } from './coach-lesson-improvement.mjs';

test('prepares only the exact existing lesson selected by the user', () => {
  const lesson = { id: 'lesson_a', book: 'تمرکز', text: 'پیش از ورود صبر کن.', tags: ['صبر'] };
  assert.deepEqual(prepareLessonImprovementContext(lesson, 'lesson_a', 2), {
    id: 'lesson_a',
    book: 'تمرکز',
    text: 'پیش از ورود صبر کن.',
    tags: ['صبر'],
    turns: 2,
  });
  assert.equal(prepareLessonImprovementContext(lesson, 'lesson_b'), null);
  assert.equal(prepareLessonImprovementContext({ ...lesson, deleted: true }, 'lesson_a'), null);
});

test('bounds note content, tags, and clarification turns', () => {
  const context = prepareLessonImprovementContext({
    id: 'lesson_a',
    book: 'b'.repeat(200),
    text: 'x'.repeat(2500),
    tags: Array.from({ length: 25 }, () => 't'.repeat(100)),
  }, 'lesson_a', 99);
  assert.equal(context.book.length, 160);
  assert.equal(context.text.length, 2000);
  assert.equal(context.tags.length, 20);
  assert.equal(context.tags[0].length, 80);
  assert.equal(context.turns, 3);
});
