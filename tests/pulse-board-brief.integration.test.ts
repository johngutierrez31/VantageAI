import { describe, expect, it } from 'vitest';
import { buildBoardBriefDraft } from '../src/lib/pulse/board-briefs';
import { renderBoardBriefHtml, renderBoardBriefMarkdown } from '../src/lib/pulse/export';

describe('pulse board brief generation', () => {
  it('produces persisted-board-brief content and stable exports', () => {
    const draft = buildBoardBriefDraft({
      reportingPeriod: '2026-Q1',
      overallScore: 67.5,
      overallDelta: 3.2,
      weakestCategory: { label: 'TrustOps Operations', score: 44.1 },
      risks: [
        { id: 'risk-1', title: 'Privileged access review gap', severity: 'CRITICAL', ownerUserId: null, targetDueAt: null }
      ],
      positiveCategories: [{ label: 'Assessment Coverage', delta: 4.3 }],
      overdueActions: ['Close privileged access review action.'],
      roadmapItems: [
        { horizon: 'DAYS_30', title: 'Reduce privileged access review gap', ownerUserId: 'user-1', dueAt: null },
        { horizon: 'DAYS_60', title: 'Refresh trust evidence', ownerUserId: null, dueAt: null },
        { horizon: 'DAYS_90', title: 'Expand quarterly review cadence', ownerUserId: null, dueAt: null }
      ]
    });

    const brief = {
      id: 'brief-1',
      title: draft.title,
      reportingPeriod: '2026-Q1',
      status: 'APPROVED',
      overallPostureSummary: draft.overallPostureSummary,
      topRiskIds: draft.topRiskIds,
      notableImprovements: draft.notableImprovements,
      overdueActions: draft.overdueActions,
      leadershipDecisionsNeeded: draft.leadershipDecisionsNeeded,
      roadmap30Days: draft.roadmap30Days,
      roadmap60Days: draft.roadmap60Days,
      roadmap90Days: draft.roadmap90Days,
      reviewerNotes: null,
      createdBy: 'user-1',
      reviewedBy: null,
      approvedBy: 'user-1',
      reviewedAt: null,
      approvedAt: null,
      lastExportedAt: null,
      exportCount: 0,
      createdAt: new Date('2026-03-08T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z'),
      tenantId: 'tenant-1',
      snapshotId: 'snapshot-1',
      roadmapId: 'roadmap-1',
      snapshot: {
        reportingPeriod: '2026-Q1',
        overallScore: 67.5,
        overallDelta: 3.2
      },
      roadmap: {
        name: 'Executive Roadmap 2026-Q1',
        status: 'NEEDS_REVIEW'
      }
    };

    const risks = [
      {
        id: 'risk-1',
        tenantId: 'tenant-1',
        title: 'Privileged access review gap',
        normalizedRiskStatement: 'privileged access review gap',
        description: 'desc',
        businessImpactSummary: 'impact',
        sourceType: 'TRUSTOPS_EVIDENCE_GAP',
        sourceModule: 'TRUSTOPS',
        sourceKey: 'finding:1',
        sourceReference: null,
        severity: 'CRITICAL',
        likelihood: 'HIGH',
        impact: 'HIGH',
        status: 'OPEN',
        ownerUserId: null,
        targetDueAt: null,
        linkedControlIds: [],
        linkedFindingIds: [],
        linkedTaskIds: [],
        linkedQuestionnaireIds: [],
        linkedEvidenceMapIds: [],
        linkedTrustPacketIds: [],
        linkedAssessmentIds: [],
        reviewNotes: null,
        reviewedBy: null,
        reviewedAt: null,
        createdBy: 'user-1',
        createdAt: new Date('2026-03-08T00:00:00.000Z'),
        updatedAt: new Date('2026-03-08T00:00:00.000Z')
      }
    ];

    const markdown = renderBoardBriefMarkdown(brief as never, risks as never);
    const html = renderBoardBriefHtml(brief as never, risks as never);

    expect(draft.leadershipDecisionsNeeded[0]).toContain('Assign an executive owner');
    expect(markdown).toContain('Top Risks');
    expect(html).toContain('<html');
    expect(html).toContain('Leadership Decisions Needed');
  });
});
