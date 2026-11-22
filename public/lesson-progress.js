window.summarizeLessonAdherence = function summarizeLessonAdherence(lessons, reviews) {
  if (!Array.isArray(lessons) || !Array.isArray(reviews)) {
    throw new TypeError('Lessons and reviews must be arrays.');
  }
  const reviewsByLesson = new Map(reviews.map((review) => [String(review?.lessonId || ''), review]));
  return lessons.map((lesson) => {
    const review = reviewsByLesson.get(String(lesson?.id || ''));
    const links = Array.isArray(review?.linkedTrades) ? review.linkedTrades
      .filter((link) => ['followed', 'not_followed', 'unclear'].includes(link?.status))
      .slice(-20)
      .sort((left, right) => {
        const leftDate = Date.parse(left.tradeDate || left.linkedAt || '');
        const rightDate = Date.parse(right.tradeDate || right.linkedAt || '');
        return (Number.isFinite(leftDate) ? leftDate : 0) - (Number.isFinite(rightDate) ? rightDate : 0);
      }) : [];
    const followed = links.filter((link) => link.status === 'followed').length;
    const notFollowed = links.filter((link) => link.status === 'not_followed').length;
    const unclear = links.filter((link) => link.status === 'unclear').length;
    const assessed = links.filter((link) => link.status !== 'unclear');
    let status = 'insufficient';
    let trend = null;
    if (assessed.length >= 6) {
      const previous = assessed.slice(-6, -3);
      const recent = assessed.slice(-3);
      const previousFollowed = previous.filter((link) => link.status === 'followed').length;
      const recentFollowed = recent.filter((link) => link.status === 'followed').length;
      trend = { previousFollowed, recentFollowed };
      status = recentFollowed > previousFollowed
        ? 'improving'
        : recentFollowed < previousFollowed ? 'needs_practice' : recentFollowed === 3 ? 'observed_adherence' : 'needs_practice';
    } else if (notFollowed >= 2) {
      status = 'needs_practice';
    } else if (assessed.length >= 2 && followed === assessed.length) {
      status = 'observed_adherence';
    } else if (assessed.length >= 2) {
      status = 'mixed';
    }
    return {
      lessonId: String(lesson?.id || ''),
      book: String(lesson?.book || '').slice(0, 160),
      text: String(lesson?.text || '').slice(0, 240),
      status,
      followed,
      notFollowed,
      unclear,
      examples: links.slice(-3).reverse().map((link) => ({
        token: String(link.token || 'معامله').slice(0, 100),
        tradeDate: String(link.tradeDate || '').slice(0, 40),
        status: link.status,
        evidence: String(link.evidence || '').slice(0, 180),
      })),
      ...(trend ? { trend } : {}),
    };
  });
};
