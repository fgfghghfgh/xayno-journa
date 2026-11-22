export function prepareLessonImprovementContext(lesson, lessonId, turns = 0) {
  const requestedId = String(lessonId || '');
  if (!/^[A-Za-z0-9_-]{1,170}$/.test(requestedId)) return null;
  if (!lesson || lesson.deleted || String(lesson.id || '') !== requestedId
    || typeof lesson.book !== 'string' || typeof lesson.text !== 'string') return null;
  return {
    id: requestedId,
    book: lesson.book.slice(0, 160),
    text: lesson.text.slice(0, 2000),
    tags: Array.isArray(lesson.tags)
      ? lesson.tags.filter((tag) => typeof tag === 'string').slice(0, 20).map((tag) => tag.slice(0, 80))
      : [],
    turns: Math.max(0, Math.min(3, Number(turns) || 0)),
  };
}
