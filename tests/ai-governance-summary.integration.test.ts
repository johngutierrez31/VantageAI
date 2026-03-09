import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  aiUseCaseCount,
  aiUseCaseFindMany,
  aiVendorReviewCount,
  aiVendorReviewFindMany,
  findingCount,
  riskCount
} = vi.hoisted(() => ({
  aiUseCaseCount: vi.fn(),
  aiUseCaseFindMany: vi.fn(),
  aiVendorReviewCount: vi.fn(),
  aiVendorReviewFindMany: vi.fn(),
  findingCount: vi.fn(),
  riskCount: vi.fn()
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    aIUseCase: {
      count: aiUseCaseCount,
      findMany: aiUseCaseFindMany
    },
    aIVendorReview: {
      count: aiVendorReviewCount,
      findMany: aiVendorReviewFindMany
    },
    finding: {
      count: findingCount
    },
    riskRegisterItem: {
      count: riskCount
    }
  }
}));

import { getAIGovernanceSummary } from '../src/lib/ai-governance/summary';

describe('ai governance summary aggregation', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    aiUseCaseCount
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    aiVendorReviewCount
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    findingCount.mockResolvedValue(4);
    riskCount.mockResolvedValue(3);
    aiUseCaseFindMany.mockResolvedValue([
      {
        id: 'use-case-1',
        name: 'Board report copilot',
        status: 'APPROVED_WITH_CONDITIONS',
        riskTier: 'HIGH',
        updatedAt: new Date('2026-03-08T15:00:00.000Z')
      }
    ]);
    aiVendorReviewFindMany.mockResolvedValue([
      {
        id: 'vendor-1',
        vendorName: 'SafeAI',
        productName: 'Assistant',
        status: 'REJECTED',
        riskTier: 'CRITICAL',
        updatedAt: new Date('2026-03-08T16:00:00.000Z')
      }
    ]);
  });

  it('summarizes AI Governance posture for dashboard and Pulse surfaces', async () => {
    const summary = await getAIGovernanceSummary('tenant-1');

    expect(summary.totalUseCases).toBe(5);
    expect(summary.totalVendorReviews).toBe(3);
    expect(summary.pendingReviews).toBe(3);
    expect(summary.highRiskCount).toBe(3);
    expect(summary.rejectedCount).toBe(2);
    expect(summary.conditionalApprovalCount).toBe(2);
    expect(summary.overdueReviews).toBe(2);
    expect(summary.vendorPendingReviewCount).toBe(1);
    expect(summary.linkedOpenFindingsCount).toBe(4);
    expect(summary.linkedOpenRisksCount).toBe(3);
    expect(summary.recentDecisions[0]).toEqual(
      expect.objectContaining({
        id: 'vendor-1',
        type: 'AI_VENDOR_REVIEW',
        href: '/app/ai-governance/vendors/vendor-1'
      })
    );
  });
});
