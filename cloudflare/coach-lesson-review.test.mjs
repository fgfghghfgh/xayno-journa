import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLessonReviewAssessment,
  LESSON_REVIEW_INTERVALS_DAYS,
  prepareLessonTradeLinks,
  rankLessonViolations,
  selectDueLessonReviews,
} from './coach-lesson-review.mjs';

const lessons = [
  { id: 'lesson_a', book: 'تمرکز', text: 'پیش از ورود صبر کن.', tags: ['صبر'] },
  { id: 'lesson_b', book: 'مدیریت ترس', text: 'ترس را بشناس.', tags: ['ترس'] },
];

test('schedules reviews at 1, 3, 7, 21, and 60 days after completed reviews', () => {
  let review = null;
  let now = new Date('2026-01-01T10:00:00Z');
  review = applyLessonReviewAssessment(review, {
    lessonId: 'lesson_a',
    status: 'followed',
    evidence: 'معامله با نکته مرور شد',
  }, now);
  assert.equal(Date.parse(review.nextReviewAt) - now.getTime(), 86_400_000);
  now = new Date(review.nextReviewAt);
  for (const intervalDays of [...LESSON_REVIEW_INTERVALS_DAYS.slice(1), null]) {
    review = applyLessonReviewAssessment(review, {
      lessonId: 'lesson_a',
      status: 'followed',
      evidence: 'به نکته اشاره کردم',
    }, now);
    if (intervalDays === null) {
      assert.equal(review.completed, true);
      assert.equal(review.nextReviewAt, '');
    } else {
      assert.equal(Date.parse(review.nextReviewAt) - now.getTime(), intervalDays * 86_400_000);
      now = new Date(review.nextReviewAt);
    }
  }
  assert.equal(review.reviewCount, 6);
  assert.equal(review.followedCount, 6);
});

test('keeps unclear responses from advancing intervals and records violations', () => {
  const first = applyLessonReviewAssessment(null, {
    lessonId: 'lesson_b',
    status: 'not_followed',
    evidence: 'گفت ورود را بدون مکث انجام داده',
  }, '2026-01-01T10:00:00Z');
  assert.equal(first.violationCount, 1);
  const unclear = applyLessonReviewAssessment(first, {
    lessonId: 'lesson_b',
    status: 'unclear',
    evidence: '',
  }, '2026-01-01T12:00:00Z');
  assert.equal(unclear.violationCount, 1);
  assert.equal(unclear.nextIntervalIndex, 0);
  assert.equal(Date.parse(unclear.nextReviewAt), Date.parse('2026-01-02T12:00:00.000Z'));
});

test('does not count the same conversation assessment twice', () => {
  const assessment = {
    lessonId: 'lesson_a',
    status: 'not_followed',
    evidence: 'ورود عجولانه',
    sourceId: 'conversation_123',
  };
  const first = applyLessonReviewAssessment(null, assessment, '2026-01-01T10:00:00Z');
  const retried = applyLessonReviewAssessment(first, assessment, '2026-01-01T10:00:00Z');
  assert.equal(retried.reviewCount, 1);
  assert.equal(retried.violationCount, 1);
});

test('returns only due reviews that still have a library note', () => {
  const reviews = [
    { id: 'review_a', lessonId: 'lesson_a', nextReviewAt: '2026-01-01T00:00:00Z' },
    { id: 'review_b', lessonId: 'lesson_b', nextReviewAt: '2026-01-03T00:00:00Z' },
    { id: 'review_missing', lessonId: 'deleted_lesson', nextReviewAt: '2025-01-01T00:00:00Z' },
  ];
  assert.deepEqual(selectDueLessonReviews(reviews, lessons, '2026-01-02T00:00:00Z')
    .map((review) => review.lessonId), ['lesson_a']);
});

test('ranks lessons by observed violations', () => {
  const ranked = rankLessonViolations([
    { lessonId: 'lesson_a', violationCount: 1 },
    { lessonId: 'lesson_b', violationCount: 3, lastEvidence: 'ورود بدون مکث' },
  ], lessons);
  assert.deepEqual(ranked.map((item) => item.lessonId), ['lesson_b', 'lesson_a']);
  assert.equal(ranked[0].violationCount, 3);
});

test('links assessments only to known lesson and trade IDs and bounds evidence', () => {
  const links = prepareLessonTradeLinks([
    { lessonId: 'lesson_a', tradeId: 'trade_1', status: 'followed', evidence: 'رعایت حدضرر' },
    { lessonId: 'lesson_a', tradeId: 'trade_missing', status: 'not_followed', evidence: 'شاهد' },
    { lessonId: 'lesson_missing', tradeId: 'trade_1', status: 'not_followed', evidence: 'شاهد' },
    { lessonId: 'lesson_a', tradeId: 'trade_1', status: 'followed', evidence: 'تکراری' },
  ], lessons, [{
    id: 'trade_1',
    token: 'SOL',
    journalDate: '2026-11-23',
    status: 'closed',
    pnlPercent: -4,
  }], '2026-11-23T12:00:00Z');
  assert.equal(links.length, 1);
  assert.deepEqual(links[0], {
    lessonId: 'lesson_a',
    tradeId: 'trade_1',
    token: 'SOL',
    tradeDate: '2026-11-23',
    tradeStatus: 'closed',
    pnlPercent: -4,
    status: 'followed',
    evidence: 'رعایت حدضرر',
    sourceId: '',
    linkedAt: '2026-11-23T12:00:00.000Z',
  });

  test('accepts due review records keyed by lessonId', () => {
    const links = prepareLessonTradeLinks([
      { lessonId: 'lesson_a', tradeId: 'trade_1', status: 'not_followed', evidence: 'معامله با عجله باز شد' },
    ], [{ lessonId: 'lesson_a', book: 'تمرکز' }], [{ id: 'trade_1', token: 'SOL' }]);
    assert.equal(links.length, 1);
    assert.equal(links[0].lessonId, 'lesson_a');
  });
});
