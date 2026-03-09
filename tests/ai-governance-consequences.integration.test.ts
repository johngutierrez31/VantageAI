import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  taskFindFirst,
  taskUpdate,
  taskCreate,
  taskUpdateMany,
  findingFindFirst,
  findingUpdate,
  findingCreate,
  findingUpdateMany,
  riskUpsert,
  riskUpdateMany
} = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskUpdate: vi.fn(),
  taskCreate: vi.fn(),
  taskUpdateMany: vi.fn(),
  findingFindFirst: vi.fn(),
  findingUpdate: vi.fn(),
  findingCreate: vi.fn(),
  findingUpdateMany: vi.fn(),
  riskUpsert: vi.fn(),
  riskUpdateMany: vi.fn()
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    task: {
      findFirst: taskFindFirst,
      update: taskUpdate,
      create: taskCreate,
      updateMany: taskUpdateMany
    },
    finding: {
      findFirst: findingFindFirst,
      update: findingUpdate,
      create: findingCreate,
      updateMany: findingUpdateMany
    },
    riskRegisterItem: {
      upsert: riskUpsert,
      updateMany: riskUpdateMany
    }
  }
}));

import {
  syncAIVendorReviewConsequences,
  syncAIUseCaseConsequences
} from '../src/lib/ai-governance/consequences';

describe('ai governance downstream consequence sync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    taskFindFirst.mockResolvedValue(null);
    taskCreate.mockResolvedValue({ id: 'task-1' });
    findingFindFirst.mockResolvedValue(null);
    findingCreate.mockResolvedValue({ id: 'finding-1' });
    riskUpsert.mockResolvedValue({ id: 'risk-1' });
    findingUpdateMany.mockResolvedValue({ count: 1 });
    riskUpdateMany.mockResolvedValue({ count: 1 });
    taskUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('creates follow-up tasks, findings, and Pulse risks for high-risk use cases', async () => {
    const result = await syncAIUseCaseConsequences({
      id: 'use-case-1',
      tenantId: 'tenant-1',
      status: 'APPROVED_WITH_CONDITIONS',
      riskTier: 'HIGH',
      name: 'Customer support AI agent',
      description: 'Handles customer support triage with tool access.',
      assignedReviewerUserId: 'reviewer-1',
      reviewDueAt: new Date('2026-03-15T15:00:00.000Z'),
      matchedPolicyIds: ['policy-1'],
      decisionConditions: ['Logging must be enabled.'],
      requiredControls: ['Enable prompt logging.'],
      primaryRisks: ['The workflow can expose customer data.'],
      linkedFindingIds: [],
      linkedRiskIds: [],
      linkedTaskIds: [],
      createdBy: 'user-1'
    });

    expect(taskCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        aiUseCaseId: 'use-case-1',
        assignee: 'reviewer-1',
        priority: 'HIGH'
      })
    });
    expect(findingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        aiUseCaseId: 'use-case-1',
        sourceType: 'AI_GOVERNANCE_HIGH_RISK',
        priority: 'HIGH'
      })
    });
    expect(riskUpsert).toHaveBeenCalledWith({
      where: {
        tenantId_sourceKey: {
          tenantId: 'tenant-1',
          sourceKey: 'ai-use-case:use-case-1'
        }
      },
      update: expect.objectContaining({
        sourceModule: 'AI_GOVERNANCE',
        linkedAiUseCaseIds: ['use-case-1']
      }),
      create: expect.objectContaining({
        sourceModule: 'AI_GOVERNANCE',
        linkedAiUseCaseIds: ['use-case-1']
      })
    });
    expect(result).toEqual({
      findingIds: ['finding-1'],
      riskIds: ['risk-1'],
      taskIds: ['task-1']
    });
  });

  it('resolves findings and risks when a vendor review no longer needs escalation', async () => {
    taskFindFirst.mockResolvedValue({
      id: 'task-existing'
    });

    const result = await syncAIVendorReviewConsequences({
      id: 'vendor-review-1',
      tenantId: 'tenant-1',
      status: 'APPROVED',
      riskTier: 'LOW',
      vendorName: 'SafeAI',
      productName: 'Assistant',
      riskNotes: 'Retention is known and logging is enabled.',
      ownerUserId: 'owner-1',
      assignedReviewerUserId: 'reviewer-1',
      reviewDueAt: new Date('2026-03-18T15:00:00.000Z'),
      matchedPolicyIds: ['policy-2'],
      decisionConditions: [],
      requiredControls: [],
      primaryRisks: [],
      linkedFindingIds: [],
      linkedRiskIds: [],
      linkedTaskIds: [],
      createdBy: 'user-1'
    });

    expect(findingUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        aiVendorReviewId: 'vendor-review-1'
      }),
      data: {
        status: 'RESOLVED'
      }
    });
    expect(riskUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        sourceKey: 'ai-vendor-review:vendor-review-1'
      }),
      data: {
        status: 'CLOSED'
      }
    });
    expect(result).toEqual({
      findingIds: [],
      riskIds: [],
      taskIds: []
    });
  });
});
