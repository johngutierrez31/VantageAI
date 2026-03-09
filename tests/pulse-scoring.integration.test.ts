import { describe, expect, it } from 'vitest';
import { buildPulseReportingPeriod, buildPulseScorecardDraft, type PulseMeasuredInputs } from '../src/lib/pulse/scoring';

describe('pulse scorecard generation', () => {
  it('builds explainable scorecards with category deltas', () => {
    const measuredInputs: PulseMeasuredInputs = {
      snapshotDate: new Date('2026-03-08T00:00:00.000Z'),
      latestAssessmentScore: 2.8,
      averageAssessmentScore: 2.9,
      assessedControlCount: 12,
      scoredAssessmentCount: 2,
      assessmentGaps: [],
      openFindings: 4,
      overdueFindings: 1,
      overdueTasks: 2,
      blockedTasks: 1,
      criticalTasks: 1,
      openEvidenceGaps: 2,
      trustReviewBacklog: 3,
      answerReuseCount: 8,
      approvedAnswerCount: 10,
      approvedQuestionnaireCount: 2,
      approvedEvidenceMapsCount: 1,
      trustPacketsExported: 1,
      staleEvidenceCount: 2,
      trustInboxBacklog: 1
    };

    const draft = buildPulseScorecardDraft({
      measuredInputs,
      previousOverallScore: 58,
      previousCategories: [
        { categoryKey: 'ASSESSMENTS', score: 61 },
        { categoryKey: 'FINDINGS', score: 55 },
        { categoryKey: 'REMEDIATION', score: 52 },
        { categoryKey: 'TRUSTOPS', score: 63 },
        { categoryKey: 'BUYER_READINESS', score: 44 }
      ]
    });

    expect(buildPulseReportingPeriod(new Date('2026-03-08T00:00:00.000Z'), 'QUARTERLY')).toBe('2026-Q1');
    expect(draft.categoryScores).toHaveLength(5);
    expect(draft.overallScore).toBeGreaterThan(0);
    expect(draft.overallDelta).not.toBeNull();
    expect(draft.summaryText).toContain('Overall posture');
  });
});
