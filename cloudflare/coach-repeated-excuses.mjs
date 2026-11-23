import { coachPatternMatches } from './coach-trade-feedback.mjs';

const DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dateKey(value) {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return '';
  const parts = Object.fromEntries(DATE_FORMAT.formatToParts(date)
    .filter((part) => part.type !== 'literal')
    .map(({ type, value: partValue }) => [type, partValue]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function messageText(message) {
  return String(message?.content || '').trim().replace(/\s+/g, ' ').slice(0, 1200);
}

export function buildRepeatedExcuseReport(messages, profileAnswers = []) {
  if (!Array.isArray(messages) || !Array.isArray(profileAnswers)) {
    throw new TypeError('Messages and profile answers must be arrays.');
  }
  const observations = [];
  const seenIds = new Set();
  for (const message of messages) {
    if (message?.role !== 'user') continue;
    const text = messageText(message);
    const id = String(message.id || '');
    if (!text || !id || seenIds.has(id)) continue;
    seenIds.add(id);
    observations.push({
      id,
      source: 'chat',
      text,
      date: dateKey(message.createdAt || message.updatedAt),
    });
  }
  for (const answer of profileAnswers) {
    if (answer?.key !== 'fears_and_excuses' || answer.skipped) continue;
    const text = String(answer.answer || '').trim().replace(/\s+/g, ' ').slice(0, 1200);
    if (!text) continue;
    observations.push({
      id: `profile:${String(answer.key)}`,
      source: 'profile',
      text,
      date: dateKey(answer.updatedAt),
    });
  }

  const clusters = [];
  for (const observation of observations) {
    const cluster = clusters.find((item) => coachPatternMatches(item.phrase, observation.text));
    if (cluster) {
      if (!cluster.examples.some((example) => example.id === observation.id)) {
        cluster.examples.push(observation);
      }
    } else {
      clusters.push({ phrase: observation.text, examples: [observation] });
    }
  }
  return {
    scannedMessageCount: observations.filter((item) => item.source === 'chat').length,
    repeatedPhrases: clusters
      .filter((cluster) => cluster.examples.length >= 2)
      .sort((left, right) => right.examples.length - left.examples.length
        || left.phrase.localeCompare(right.phrase))
      .slice(0, 10)
      .map((cluster) => ({
        phrase: cluster.phrase,
        count: cluster.examples.length,
        examples: cluster.examples
          .sort((left, right) => left.date.localeCompare(right.date))
          .slice(-5)
          .map(({ source, text, date }) => ({ source, text, date })),
      })),
  };
}
