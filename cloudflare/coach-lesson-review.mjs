export const LESSON_REVIEW_INTERVALS_DAYS = Object.freeze([1, 3, 7, 21, 60]);

const VALID_STATUSES = new Set(['followed', 'not_followed', 'unclear']);

export function prepareLessonTradeLinks(assessments, lessons, trades, now = new Date()) {
  if (!Array.isArray(assessments) || !Array.isArray(lessons) || !Array.isArray(trades)) {
    throw new TypeError('Assessments, lessons, and trades must be arrays.');
  }
  const timestamp = new Date(now).getTime();
  if (!Number.isFinite(timestamp)) throw new TypeError('A valid current date is required.');
  const lessonIds = new Set(lessons.map((lesson) => String(lesson?.id || lesson?.lessonId || '')));
  const tradeById = new Map(trades.map((trade) => [String(trade?.id || ''), trade]));
  const seen = new Set();
  return assessments.slice(0, 10).flatMap((assessment) => {
    const lessonId = String(assessment?.lessonId || '');
    const tradeId = String(assessment?.tradeId || '');
    const key = `${lessonId}:${tradeId}`;
    if (!lessonIds.has(lessonId) || !tradeById.has(tradeId) || !VALID_STATUSES.has(assessment?.status)
      || !String(assessment.evidence || '').trim() || seen.has(key)) return [];
    seen.add(key);
    const trade = tradeById.get(tradeId);
    return [{
      lessonId,
      tradeId,
      token: String(trade.token || '').slice(0, 100),
      tradeDate: String(trade.journalDate || trade.openedAt || trade.date || '').slice(0, 40),
      tradeStatus: String(trade.status || '').slice(0, 20),
      pnlPercent: trade.pnlPercent ?? '',
      status: assessment.status,
      evidence: String(assessment.evidence).trim().slice(0, 400),
      sourceId: String(assessment.sourceId || '').slice(0, 100),
      linkedAt: new Date(timestamp).toISOString(),
    }];
  });
}

export function selectDueLessonReviews(reviews, lessons, now = new Date()) {
  if (!Array.isArray(reviews) || !Array.isArray(lessons)) {
    throw new TypeError('Reviews and lessons must be arrays.');
  }
  const timestamp = new Date(now).getTime();
  if (!Number.isFinite(timestamp)) throw new TypeError('A valid current date is required.');
  const lessonById = new Map(lessons.map((lesson) => [String(lesson?.id || ''), lesson]));
  return reviews
    .filter((review) => {
      const dueAt = Date.parse(review?.nextReviewAt || '');
      return review?.completed !== true && Number.isFinite(dueAt) && dueAt <= timestamp
        && lessonById.has(String(review.lessonId || ''));
    })
    .sort((left, right) => Date.parse(left.nextReviewAt) - Date.parse(right.nextReviewAt))
    .slice(0, 10)
    .map((review) => ({
      reviewId: String(review.id || '').slice(0, 170),
      lessonId: String(review.lessonId || '').slice(0, 170),
      book: String(lessonById.get(String(review.lessonId))?.book || '').slice(0, 160),
      text: String(lessonById.get(String(review.lessonId))?.text || '').slice(0, 1200),
      tags: Array.isArray(lessonById.get(String(review.lessonId))?.tags)
        ? lessonById.get(String(review.lessonId)).tags.slice(0, 12)
        : [],
      nextIntervalIndex: Math.max(0, Math.min(LESSON_REVIEW_INTERVALS_DAYS.length, Number(review.nextIntervalIndex) || 0)),
      violationCount: Math.max(0, Number(review.violationCount) || 0),
      lastStatus: String(review.lastStatus || ''),
    }));
}

export function applyLessonReviewAssessment(existing, assessment, now = new Date()) {
  const timestamp = new Date(now).getTime();
  if (!Number.isFinite(timestamp)) throw new TypeError('A valid current date is required.');
  if (!assessment || typeof assessment.lessonId !== 'string' || !assessment.lessonId.trim()
    || !VALID_STATUSES.has(assessment.status)) {
    throw new TypeError('A lesson assessment must have an ID and a supported status.');
  }

  const reviewedAt = new Date(timestamp).toISOString();
  const nextIntervalIndex = Math.max(0, Math.min(
    LESSON_REVIEW_INTERVALS_DAYS.length,
    Number(existing?.nextIntervalIndex) || 0,
  ));
  const history = Array.isArray(existing?.history) ? existing.history.slice(-19) : [];
  const sourceId = String(assessment.sourceId || '').slice(0, 100);
  if (sourceId && history.some((item) => item.sourceId === sourceId)) return existing;
  history.push({
    status: assessment.status,
    evidence: String(assessment.evidence || '').trim().slice(0, 600),
    reviewedAt,
    ...(sourceId ? { sourceId } : {}),
  });
  const violationCount = Math.max(0, Number(existing?.violationCount) || 0)
    + Number(assessment.status === 'not_followed');
  const initialAssessment = !existing;
  const nextIndex = assessment.status === 'unclear'
    ? nextIntervalIndex
    : nextIntervalIndex + Number(!initialAssessment);
  const completed = nextIndex >= LESSON_REVIEW_INTERVALS_DAYS.length && assessment.status !== 'unclear';
  const nextReviewAt = completed
    ? ''
    : new Date(timestamp + (assessment.status === 'unclear' ? 1 : LESSON_REVIEW_INTERVALS_DAYS[nextIndex]) * 86_400_000).toISOString();

  return {
    id: String(existing?.id || `lesson_review_${assessment.lessonId}`).slice(0, 170),
    lessonId: assessment.lessonId.slice(0, 170),
    firstReviewedAt: existing?.firstReviewedAt || reviewedAt,
    lastReviewedAt: reviewedAt,
    lastStatus: assessment.status,
    lastEvidence: String(assessment.evidence || '').trim().slice(0, 600),
    reviewCount: Math.max(0, Number(existing?.reviewCount) || 0) + 1,
    assessedCount: Math.max(0, Number(existing?.assessedCount) || 0)
      + Number(assessment.status !== 'unclear'),
    followedCount: Math.max(0, Number(existing?.followedCount) || 0)
      + Number(assessment.status === 'followed'),
    violationCount,
    nextIntervalIndex: nextIndex,
    nextReviewAt,
    completed,
    history,
  };
}

export function rankLessonViolations(reviews, lessons, limit = 5) {
  if (!Array.isArray(reviews) || !Array.isArray(lessons)) {
    throw new TypeError('Reviews and lessons must be arrays.');
  }
  const lessonById = new Map(lessons.map((lesson) => [String(lesson?.id || ''), lesson]));
  return reviews
    .filter((review) => Number(review?.violationCount) > 0 && lessonById.has(String(review.lessonId || '')))
    .sort((left, right) => Number(right.violationCount) - Number(left.violationCount)
      || String(right.lastReviewedAt || '').localeCompare(String(left.lastReviewedAt || '')))
    .slice(0, Math.max(1, Math.min(10, Number(limit) || 5)))
    .map((review) => ({
      lessonId: String(review.lessonId),
      book: String(lessonById.get(String(review.lessonId)).book || '').slice(0, 160),
      text: String(lessonById.get(String(review.lessonId)).text || '').slice(0, 300),
      violationCount: Number(review.violationCount),
      lastEvidence: String(review.lastEvidence || '').slice(0, 240),
    }));
}
