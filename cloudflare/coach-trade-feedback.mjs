export function normalizeCoachPattern(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase()
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

export function coachPatternMatches(left, right) {
  const first = normalizeCoachPattern(left);
  const second = normalizeCoachPattern(right);
  if (!first || !second) return false;
  if (first === second) return true;
  const firstWords = new Set(first.split(' ').filter((word) => word.length > 1));
  const secondWords = new Set(second.split(' ').filter((word) => word.length > 1));
  if (firstWords.size < 2 || secondWords.size < 2) return false;
  const common = [...firstWords].filter((word) => secondWords.has(word)).length;
  return common / Math.min(firstWords.size, secondWords.size) >= 0.7;
}
