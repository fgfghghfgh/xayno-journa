function cleanText(value) {
  return typeof value === 'string' ? value.trim().slice(0, 1000) : '';
}

function normalizedText(value) {
  return cleanText(value)
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\s]+/g, ' ')
    .toLocaleLowerCase();
}

export function buildCoachCommitmentTasks(session, previousTasks = []) {
  const previousByText = new Map(
    previousTasks
      .filter((task) => task && typeof task.text === 'string')
      .map((task) => [normalizedText(task.text), task]),
  );
  const candidates = [
    ...(Array.isArray(session?.commitments) ? session.commitments.map((text) => ({ text, source: 'commitment' })) : []),
    ...(typeof session?.homework === 'string' ? [{ text: session.homework, source: 'homework' }] : []),
  ];
  const seen = new Set();
  return candidates
    .map(({ text, source }) => ({ text: cleanText(text), source }))
    .filter(({ text }) => text && !seen.has(normalizedText(text)) && seen.add(normalizedText(text)))
    .slice(0, 10)
    .map(({ text, source }, index) => {
      const previous = previousByText.get(normalizedText(text));
      return {
        id: previous?.id || `task-${index + 1}`,
        text,
        source,
        status: ['pending', 'completed', 'blocked', 'cancelled'].includes(previous?.status)
          ? previous.status
          : 'pending',
        createdAt: previous?.createdAt || session?.createdAt || new Date().toISOString(),
      };
    });
}

export function coachCommitmentTasksForSession(session) {
  if (Array.isArray(session?.commitmentTasks) && session.commitmentTasks.length) {
    return session.commitmentTasks
      .filter((task) => task && typeof task.text === 'string' && task.text.trim())
      .map((task, index) => ({
        ...task,
        id: typeof task.id === 'string' ? task.id : `task-${index + 1}`,
        status: ['pending', 'completed', 'blocked', 'cancelled'].includes(task.status)
          ? task.status
          : (['completed', 'blocked', 'cancelled'].includes(session.followUpStatus) ? session.followUpStatus : 'pending'),
      }));
  }
  return buildCoachCommitmentTasks(session).map((task) => ({
    ...task,
    status: ['completed', 'blocked', 'cancelled'].includes(session.followUpStatus)
      ? session.followUpStatus
      : 'pending',
  }));
}

function summarize(tasks) {
  const active = tasks.filter((task) => task.status !== 'cancelled');
  const completed = active.filter((task) => task.status === 'completed').length;
  return {
    total: active.length,
    completed,
    score: active.length ? Math.round((completed / active.length) * 100) : null,
  };
}

export function summarizeCoachCommitments(sessions, now = Date.now()) {
  const allTasks = sessions.flatMap((session) => coachCommitmentTasksForSession(session).map((task) => ({
    ...task,
    sessionId: session.id,
    createdAt: task.createdAt || session.createdAt || '',
    sessionSummary: session.summary || '',
  }))).sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  const recentTasks = allTasks.filter((task) => {
    const createdAt = Date.parse(task.createdAt);
    return Number.isFinite(createdAt) && createdAt >= cutoff && createdAt <= now;
  });
  return {
    allTime: summarize(allTasks),
    last30Days: summarize(recentTasks),
    tasks: allTasks,
  };
}

export function getAdaptiveCoachTone(sessions, now = Date.now()) {
  const recentTasks = sessions
    .flatMap((session) => coachCommitmentTasksForSession(session).map((task) => ({
      ...task,
      session,
      timestamp: Date.parse(task.createdAt || session.createdAt || ''),
    })))
    .filter((task) => Number.isFinite(task.timestamp)
      && task.timestamp >= now - 30 * 24 * 60 * 60 * 1000
      && task.timestamp <= now)
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 10);
  let completed = 0;
  let overdue = 0;
  let blocked = 0;
  for (const { status, session, timestamp } of recentTasks) {
    if (status === 'completed') {
      completed += 1;
      continue;
    }
    if (status === 'blocked') {
      blocked += 1;
      continue;
    }
    if (status !== 'pending') continue;
    const dueAt = Date.parse(String(session.followUpDueAt || ''));
    const isOverdue = Number.isFinite(dueAt)
      ? dueAt <= now
      : now - timestamp >= 24 * 60 * 60 * 1000;
    if (isOverdue) overdue += 1;
  }
  const evaluated = completed + overdue;
  const completionRate = evaluated ? completed / evaluated : null;
  const mode = evaluated < 3
    ? 'supportive'
    : completionRate >= 0.8
      ? 'supportive'
      : completionRate <= 0.5
        ? 'direct'
        : 'balanced';
  return {
    mode,
    sampleSize: evaluated,
    completed,
    overdue,
    blocked,
    completionRate: completionRate === null ? null : Math.round(completionRate * 100),
  };
}
