import { ScoreResult, ScoredQuestion } from './types';

function weightedAverage(items: Array<{ score: number; weight: number }>) {
  const denominator = items.reduce((sum, current) => sum + current.weight, 0);
  if (!denominator) return 0;
  const numerator = items.reduce((sum, current) => sum + current.score * current.weight, 0);
  return Number((numerator / denominator).toFixed(2));
}

export function computeAssessmentScore(questions: ScoredQuestion[]): ScoreResult {
  const overall = weightedAverage(questions.map((q) => ({ score: q.score, weight: q.weight })));
  const confidence = Number(
    weightedAverage(questions.map((q) => ({ score: q.confidence ?? 0.5, weight: q.weight }))).toFixed(2)
  );

  const domainBuckets = new Map<string, Array<{ score: number; weight: number }>>();
  for (const q of questions) {
    const bucket = domainBuckets.get(q.domain) ?? [];
    bucket.push({ score: q.score, weight: q.weight });
    domainBuckets.set(q.domain, bucket);
  }

  const byDomain = Object.fromEntries(
    Array.from(domainBuckets.entries()).map(([domain, values]) => [domain, weightedAverage(values)])
  );

  const gaps = questions
    .filter((q) => q.score <= 2)
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map((q) => ({
      domain: q.domain,
      controlCode: q.controlCode,
      score: q.score,
      recommendation: `Improve ${q.controlCode} with an owner, timeline, and evidence collection plan.`
    }));

  return { overall, confidence, byDomain, gaps };
}
