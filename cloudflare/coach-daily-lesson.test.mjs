import assert from 'node:assert/strict';
import test from 'node:test';
import { getTehranDateKey, selectDailyLessonTrades, selectRelevantLessonNotes } from './coach-daily-lesson.mjs';

test('selects trades from the Tehran journal day and bounds the context', () => {
  const trades = [
    { id: 'today-journal', journalDate: '2026-11-23', openedAt: '2026-11-22T21:00:00Z' },
    { id: 'today-time', openedAt: '2026-11-22T21:30:00Z' },
    { id: 'yesterday', journalDate: '2026-11-22', openedAt: '2026-11-22T19:00:00Z' },
  ];
  assert.equal(getTehranDateKey(new Date('2026-11-22T21:00:00Z')), '2026-11-23');
  assert.deepEqual(selectDailyLessonTrades(trades, '2026-11-23').trades.map((trade) => trade.id), [
    'today-time',
    'today-journal',
  ]);
  assert.equal(selectDailyLessonTrades(trades, '2026-11-23').totalCount, 2);
  assert.equal(selectDailyLessonTrades(trades, '2026-11-23', 1).trades.length, 1);
});

test('selects at most two library notes with actual journal-word evidence', () => {
  const trades = [{ emotion: 'ترس از ورود و بی‌صبری', mistakes: 'ورود عجولانه' }];
  const lessons = [
    { book: 'تمرکز', text: 'پیش از ورود صبر کن و عجله نکن', tags: ['صبر'] },
    { book: 'مدیریت ترس', text: 'ترس را هنگام ورود بشناس', tags: ['ترس'] },
    { book: 'طمع', text: 'برای سود بیشتر عجله نکن', tags: ['طمع'] },
    { book: 'موضوع نامرتبط', text: 'نکته‌ای دربارهٔ خواب', tags: ['خواب'] },
  ];
  const result = selectRelevantLessonNotes(trades, lessons);
  assert.equal(result.length, 2);
  assert.ok(result.some((lesson) => lesson.book === 'مدیریت ترس'));
  assert.ok(result.some((lesson) => lesson.book === 'تمرکز'));
  assert.equal(selectRelevantLessonNotes([], lessons).length, 0);
});
