import { describe, expect, it } from 'vitest';
import {
  buildAIGovernanceReviewQueueMetrics,
  getAIGovernanceReviewTiming,
  type AIGovernanceReviewItem
} from '../src/lib/ai-governance/review-queue';

function makeItem(overrides: Partial<AIGovernanceReviewItem> = {}): AIGovernanceReviewItem {
  return {
    id: 'item-1',
    type: 'AI_USE_CASE',
    title: 'Customer support copilot',
    status: 'NEEDS_REVIEW',
    riskTier: 'HIGH',
    ownerLabel: 'Operations',
    assignedReviewerUserId: 'reviewer-1',
    assignedReviewerLabel: 'Security Lead',
    reviewDueAt: '2026-03-10T15:00:00.000Z',
    href: '/app/ai-governance/use-cases/item-1',
    ...overrides
  };
}

describe('ai governance review queue timing', () => {
  it('classifies overdue, due-soon, and unscheduled review items', () => {
    const now = new Date('2026-03-08T15:00:00.000Z');

    expect(getAIGovernanceReviewTiming(makeItem({ reviewDueAt: '2026-03-08T14:00:00.000Z' }), now)).toBe('OVERDUE');
    expect(getAIGovernanceReviewTiming(makeItem({ reviewDueAt: '2026-03-09T12:00:00.000Z' }), now)).toBe('DUE_SOON');
    expect(getAIGovernanceReviewTiming(makeItem({ reviewDueAt: null }), now)).toBe('UNSCHEDULED');
    expect(getAIGovernanceReviewTiming(makeItem({ status: 'APPROVED' }), now)).toBe('DONE');
  });

  it('builds queue metrics for active AI review operations', () => {
    const now = new Date('2026-03-08T15:00:00.000Z');
    const metrics = buildAIGovernanceReviewQueueMetrics(
      [
        makeItem({ id: 'overdue-1', reviewDueAt: '2026-03-08T12:00:00.000Z' }),
        makeItem({ id: 'due-soon-1', reviewDueAt: '2026-03-09T12:00:00.000Z', assignedReviewerUserId: null }),
        makeItem({ id: 'on-track-low', riskTier: 'LOW', reviewDueAt: '2026-03-12T12:00:00.000Z' }),
        makeItem({ id: 'done-1', status: 'REJECTED', reviewDueAt: '2026-03-07T12:00:00.000Z' })
      ],
      now
    );

    expect(metrics).toEqual({
      total: 3,
      overdue: 1,
      dueSoon: 1,
      unassigned: 1,
      highRisk: 2
    });
  });
});
