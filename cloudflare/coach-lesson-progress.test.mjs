import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../public/lesson-progress.js', import.meta.url), 'utf8');
const browser = { window: {} };
vm.runInNewContext(source, browser);
const summarizeLessonAdherence = browser.window.summarizeLessonAdherence;

test('reports descriptive improvement from dated linked trade evidence', () => {
  const lessons = [{ id: 'lesson_a', book: 'تمرکز', text: 'پیش از ورود صبر کن.' }];
  const linkedTrades = [
    { status: 'not_followed', tradeDate: '2026-01-01', token: 'A', evidence: 'ورود عجولانه' },
    { status: 'not_followed', tradeDate: '2026-01-02', token: 'B', evidence: 'بدون مکث وارد شد' },
    { status: 'followed', tradeDate: '2026-01-03', token: 'C', evidence: 'برای تأیید صبر کرد' },
    { status: 'followed', tradeDate: '2026-01-04', token: 'D', evidence: 'منتظر ماند' },
    { status: 'followed', tradeDate: '2026-01-05', token: 'E', evidence: 'ورود طبق برنامه' },
    { status: 'followed', tradeDate: '2026-01-06', token: 'F', evidence: 'شرط ورود بررسی شد' },
  ];
  const [summary] = summarizeLessonAdherence(lessons, [{ lessonId: 'lesson_a', linkedTrades }]);
  assert.equal(summary.status, 'improving');
  assert.deepEqual(JSON.parse(JSON.stringify(summary.trend)), { previousFollowed: 1, recentFollowed: 3 });
  assert.deepEqual(summary.examples.map((item) => item.token), ['F', 'E', 'D']);
});

test('does not make a progress claim from sparse evidence and includes real examples', () => {
  const [summary] = summarizeLessonAdherence(
    [{ id: 'lesson_a', book: 'مدیریت ریسک' }],
    [{ lessonId: 'lesson_a', linkedTrades: [
      { status: 'not_followed', token: 'SOL', tradeDate: '2026-02-01', evidence: 'حدضرر ثبت نشده' },
    ] }],
  );
  assert.equal(summary.status, 'insufficient');
  assert.equal(summary.examples.length, 1);
  assert.equal(summary.examples[0].evidence, 'حدضرر ثبت نشده');
});

test('marks repeated non-adherence for practice and keeps uncertainty separate', () => {
  const [summary] = summarizeLessonAdherence(
    [{ id: 'lesson_a', book: 'صبر' }],
    [{ lessonId: 'lesson_a', linkedTrades: [
      { status: 'not_followed' },
      { status: 'unclear' },
      { status: 'not_followed' },
    ] }],
  );
  assert.equal(summary.status, 'needs_practice');
  assert.equal(summary.notFollowed, 2);
  assert.equal(summary.unclear, 1);
});

test('rejects invalid report inputs and bounds displayed lesson and evidence fields', () => {
  assert.throws(() => summarizeLessonAdherence(null, []), { name: 'TypeError' });
  const [summary] = summarizeLessonAdherence(
    [{ id: 'lesson_a', book: 'x'.repeat(200), text: 'y'.repeat(400) }],
    [{ lessonId: 'lesson_a', linkedTrades: [{
      status: 'followed',
      token: 'T'.repeat(120),
      evidence: 'E'.repeat(220),
    }] }],
  );
  assert.equal(summary.book.length, 160);
  assert.equal(summary.text.length, 240);
  assert.equal(summary.examples[0].token.length, 100);
  assert.equal(summary.examples[0].evidence.length, 180);
});
