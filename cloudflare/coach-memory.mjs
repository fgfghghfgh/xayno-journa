import { normalizeCoachPattern } from './coach-trade-feedback.mjs';

const CORRECTION_PATTERN = /اصلاح|منظورم|درستش|در واقع|درحقیقت|نه[،، ]|این برداشت|برداشتت|یادم رفت بگم|اشتباهه|اشتباه است|درست نیست/i;

function evidenceMatchesMessage(evidence, message) {
  const normalizedEvidence = normalizeCoachPattern(evidence);
  const normalizedMessage = normalizeCoachPattern(message);
  return normalizedEvidence.length >= 5 && normalizedMessage.includes(normalizedEvidence);
}

export function prepareCoachMemoryUpdates(existingMemories, proposedMemories, userMessage, now = new Date().toISOString()) {
  if (!Array.isArray(proposedMemories)) return { records: [], removedIds: [], upserts: [] };
  const existing = existingMemories.filter((memory) => ['automatic', 'coach_inference', 'user_statement'].includes(memory.memorySource));
  const existingById = new Map(existing.map((memory) => [memory.id, memory]));
  const isCorrection = CORRECTION_PATTERN.test(String(userMessage || ''));
  const candidates = proposedMemories.slice(0, 30).flatMap((proposal) => {
    if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) return [];
    const content = String(proposal.content || '').trim().replace(/\s+/g, ' ').slice(0, 400);
    const evidence = String(proposal.evidence || '').trim().replace(/\s+/g, ' ').slice(0, 500);
    const source = proposal.source === 'user_statement' ? 'user_statement'
      : proposal.source === 'coach_inference' ? 'coach_inference' : '';
    const confidence = Math.max(0, Math.min(1, Number(proposal.confidence) || 0));
    if (!content || !evidence || !source || confidence < 0.55) return [];
    if (source === 'user_statement' && !evidenceMatchesMessage(evidence, userMessage)) return [];
    const supersedes = isCorrection && source === 'user_statement' && evidenceMatchesMessage(evidence, userMessage)
      && Array.isArray(proposal.supersedes)
      ? proposal.supersedes.filter((id) => existingById.has(id)
        && ['automatic', 'coach_inference', 'user_statement'].includes(existingById.get(id).memorySource))
      : [];
    return [{
      id: existing.find((memory) => normalizeCoachPattern(memory.content) === normalizeCoachPattern(content))?.id
        || `coach_memory_${crypto.randomUUID()}`,
      kind: 'coach_memory',
      memorySource: source,
      content,
      evidence,
      confidence,
      createdAt: existing.find((memory) => normalizeCoachPattern(memory.content) === normalizeCoachPattern(content))?.createdAt || now,
      updatedAt: now,
    }, ...supersedes.map((id) => ({ removeId: id }))];
  });
  const removedIds = [...new Set(candidates.filter((item) => item.removeId).map((item) => item.removeId))];
  const uniqueReplacements = new Map();
  for (const item of candidates.filter((candidate) => !candidate.removeId)) {
    const key = normalizeCoachPattern(item.content);
    if (!uniqueReplacements.has(key)) uniqueReplacements.set(key, item);
  }
  const replacements = [...uniqueReplacements.values()];
  const replacementKeys = new Set(replacements.map((item) => normalizeCoachPattern(item.content)));
  const current = existing
    .filter((memory) => !removedIds.includes(memory.id)
      && !replacementKeys.has(normalizeCoachPattern(memory.content)))
    .map((memory) => ({
      ...memory,
      memorySource: memory.memorySource === 'automatic' ? 'coach_inference' : memory.memorySource,
      evidence: String(memory.evidence || ''),
      confidence: Number.isFinite(Number(memory.confidence))
        ? Number(memory.confidence)
        : (memory.memorySource === 'automatic' ? 0.45 : 1),
    }));
  const merged = [...replacements, ...current].slice(0, 30);
  const upserts = replacements.filter((replacement) => {
    const previous = existingById.get(replacement.id);
    return !previous || previous.content !== replacement.content
      || (previous.memorySource === 'automatic' ? 'coach_inference' : previous.memorySource) !== replacement.memorySource
      || String(previous.evidence || '') !== replacement.evidence
      || Number(previous.confidence) !== replacement.confidence;
  });
  return { records: merged, removedIds, upserts };
}
