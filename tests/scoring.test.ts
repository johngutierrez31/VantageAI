import { describe, expect, it } from 'vitest';
import { computeAssessmentScore } from '../src/lib/scoring/engine';

describe('computeAssessmentScore', () => {
  it('computes weighted overall and domain scores deterministically', () => {
    const result = computeAssessmentScore([
      { domain: 'Governance', controlCode: 'SEC-1', score: 4, weight: 2, confidence: 0.9 },
      { domain: 'Governance', controlCode: 'SEC-2', score: 2, weight: 1, confidence: 0.6 },
      { domain: 'Access', controlCode: 'SEC-3', score: 1, weight: 1, confidence: 0.5 }
    ]);

    expect(result.overall).toBe(2.75);
    expect(result.confidence).toBe(0.73);
    expect(result.byDomain.Governance).toBe(3.33);
    expect(result.byDomain.Access).toBe(1);
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  it('returns zeroed scores for empty inputs', () => {
    const result = computeAssessmentScore([]);
    expect(result.overall).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.byDomain).toEqual({});
    expect(result.gaps).toEqual([]);
  });
});
