import { describe, expect, it } from 'vitest';
import { buildRoadmapDraft } from '../src/lib/pulse/roadmap';

describe('pulse roadmap generation', () => {
  it('assigns 30/60/90 horizons from current risk pressure and weak categories', () => {
    const items = buildRoadmapDraft({
      now: new Date('2026-03-08T00:00:00.000Z'),
      risks: [
        {
          id: 'risk-1',
          title: 'Privileged access review gap',
          description: 'Executive owner is missing for privileged access governance.',
          businessImpactSummary: 'High-risk admin exposure persists.',
          severity: 'CRITICAL',
          likelihood: 'HIGH',
          targetDueAt: null,
          linkedFindingIds: ['finding-1'],
          linkedTaskIds: ['task-1'],
          linkedControlIds: ['IAM-1']
        },
        {
          id: 'risk-2',
          title: 'Vendor evidence backlog',
          description: 'Trust evidence backlog is growing.',
          businessImpactSummary: 'Buyer diligence turnaround is slowing.',
          severity: 'MEDIUM',
          likelihood: 'MEDIUM',
          targetDueAt: null,
          linkedFindingIds: [],
          linkedTaskIds: [],
          linkedControlIds: ['TRUST-1']
        }
      ],
      weakCategories: [
        {
          label: 'TrustOps Operations',
          score: 41,
          summaryText: 'Review backlog is materially elevated.'
        }
      ]
    });

    expect(items.some((item) => item.horizon === 'DAYS_30')).toBe(true);
    expect(items.some((item) => item.horizon === 'DAYS_60')).toBe(true);
    expect(items[0]?.title).toContain('Reduce');
  });
});
