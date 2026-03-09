import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  aiUseCaseCreate,
  aiUseCaseUpdate,
  aiUseCaseFindMany,
  aiVendorReviewCreate,
  aiVendorReviewUpdate,
  aiVendorReviewFindFirst,
  aiVendorReviewFindMany
} = vi.hoisted(() => ({
  aiUseCaseCreate: vi.fn(),
  aiUseCaseUpdate: vi.fn(),
  aiUseCaseFindMany: vi.fn(),
  aiVendorReviewCreate: vi.fn(),
  aiVendorReviewUpdate: vi.fn(),
  aiVendorReviewFindFirst: vi.fn(),
  aiVendorReviewFindMany: vi.fn()
}));

const {
  evaluateAIGovernancePolicyMock,
  syncAIUseCaseConsequencesMock,
  syncAIVendorReviewConsequencesMock
} = vi.hoisted(() => ({
  evaluateAIGovernancePolicyMock: vi.fn(),
  syncAIUseCaseConsequencesMock: vi.fn(),
  syncAIVendorReviewConsequencesMock: vi.fn()
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    aIUseCase: {
      create: aiUseCaseCreate,
      update: aiUseCaseUpdate,
      findMany: aiUseCaseFindMany
    },
    aIVendorReview: {
      create: aiVendorReviewCreate,
      update: aiVendorReviewUpdate,
      findFirst: aiVendorReviewFindFirst,
      findMany: aiVendorReviewFindMany
    }
  }
}));

vi.mock('@/lib/ai-governance/policy-mapping', () => ({
  evaluateAIGovernancePolicy: evaluateAIGovernancePolicyMock
}));

vi.mock('@/lib/ai-governance/consequences', () => ({
  syncAIUseCaseConsequences: syncAIUseCaseConsequencesMock,
  syncAIVendorReviewConsequences: syncAIVendorReviewConsequencesMock
}));

import {
  createAIVendorReviewRecord,
  createAIUseCaseRecord,
  listAIVendorReviews,
  listAIUseCases
} from '../src/lib/ai-governance/records';

describe('ai governance records', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    evaluateAIGovernancePolicyMock.mockResolvedValue({
      riskTier: 'HIGH',
      humanReviewRequired: true,
      allowedDataClasses: ['PUBLIC'],
      restrictedDataClasses: ['CUSTOMER_DATA'],
      prohibitedDataClasses: [],
      matchedPolicyIds: ['policy-1'],
      requiredConditions: ['HUMAN_REVIEW_REQUIRED', 'LOGGING_REQUIRED'],
      unmetRequirements: [],
      approvalBlockers: [],
      decisionConditions: ['Enable logging before wider rollout.'],
      primaryRisks: ['Customer data is in scope.'],
      requiredControls: ['Enable durable audit logging.'],
      recommendedDecision: 'APPROVED_WITH_CONDITIONS',
      notes: []
    });
    syncAIUseCaseConsequencesMock.mockResolvedValue({
      findingIds: ['finding-1'],
      riskIds: ['risk-1'],
      taskIds: ['task-1']
    });
    syncAIVendorReviewConsequencesMock.mockResolvedValue({
      findingIds: ['finding-2'],
      riskIds: ['risk-2'],
      taskIds: ['task-2']
    });
    aiVendorReviewFindFirst.mockResolvedValue({
      id: 'vendor-review-1',
      vendorName: 'SafeAI',
      status: 'APPROVED',
      retentionPolicyStatus: 'KNOWN',
      trainsOnCustomerData: 'NO',
      subprocessorsStatus: 'YES',
      loggingSupport: 'YES',
      authenticationSupport: 'YES'
    });
  });

  it('creates a durable AI use case record and syncs downstream consequences', async () => {
    aiUseCaseCreate.mockResolvedValue({
      id: 'use-case-1',
      tenantId: 'tenant-1',
      name: 'Security triage copilot',
      description: 'Summarizes inbound alerts for the analyst.',
      assignedReviewerUserId: 'reviewer-1',
      reviewDueAt: new Date('2026-03-12T15:00:00.000Z'),
      matchedPolicyIds: ['policy-1'],
      decisionConditions: ['Enable logging before wider rollout.'],
      requiredControls: ['Enable durable audit logging.'],
      primaryRisks: ['Customer data is in scope.'],
      linkedFindingIds: [],
      linkedRiskIds: [],
      linkedTaskIds: [],
      status: 'APPROVED_WITH_CONDITIONS',
      riskTier: 'HIGH',
      createdBy: 'user-1'
    });
    aiUseCaseUpdate.mockResolvedValue({
      id: 'use-case-1',
      linkedFindingIds: ['finding-1'],
      linkedRiskIds: ['risk-1'],
      linkedTaskIds: ['task-1']
    });

    const record = await createAIUseCaseRecord({
      tenantId: 'tenant-1',
      userId: 'user-1',
      input: {
        name: 'Security triage copilot',
        description: 'Summarizes inbound alerts for the analyst.',
        businessOwner: 'Security',
        useCaseType: 'SECURITY_WORKFLOW',
        workflowType: 'ASSISTANT',
        vendorName: 'SafeAI',
        vendorReviewId: 'vendor-review-1',
        deploymentContext: 'SAAS',
        dataClasses: ['CUSTOMER_DATA'],
        customerDataInvolved: 'YES',
        regulatedDataInvolved: 'NO',
        secretsInvolved: 'NO',
        externalToolAccess: 'NO',
        internetAccess: 'YES',
        humanReviewRequired: true,
        linkedPolicyIds: ['policy-1'],
        evidenceArtifactIds: [],
        assignedReviewerUserId: 'reviewer-1',
        reviewDueAt: new Date('2026-03-12T15:00:00.000Z')
      }
    });

    expect(aiUseCaseCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        vendorReviewId: 'vendor-review-1',
        status: 'NEEDS_REVIEW',
        riskTier: 'HIGH',
        matchedPolicyIds: ['policy-1'],
        requiredControls: ['Enable durable audit logging.']
      })
    });
    expect(syncAIUseCaseConsequencesMock).toHaveBeenCalled();
    expect(aiUseCaseUpdate).toHaveBeenCalledWith({
      where: { id: 'use-case-1' },
      data: {
        linkedFindingIds: ['finding-1'],
        linkedRiskIds: ['risk-1'],
        linkedTaskIds: ['task-1']
      }
    });
    expect(record).toEqual({
      id: 'use-case-1',
      linkedFindingIds: ['finding-1'],
      linkedRiskIds: ['risk-1'],
      linkedTaskIds: ['task-1']
    });
  });

  it('blocks direct approval when policy blockers remain open', async () => {
    evaluateAIGovernancePolicyMock.mockResolvedValueOnce({
      riskTier: 'CRITICAL',
      humanReviewRequired: true,
      allowedDataClasses: [],
      restrictedDataClasses: ['CUSTOMER_DATA'],
      prohibitedDataClasses: ['SECRETS'],
      matchedPolicyIds: ['policy-2'],
      requiredConditions: ['HUMAN_REVIEW_REQUIRED'],
      unmetRequirements: ['NO_CUSTOMER_SECRETS'],
      approvalBlockers: ['NO_CUSTOMER_SECRETS'],
      decisionConditions: ['Secrets must be removed from prompts.'],
      primaryRisks: ['Secrets may leak through prompts.'],
      requiredControls: ['Block secrets from context windows.'],
      recommendedDecision: 'REJECTED',
      notes: []
    });

    await expect(
      createAIUseCaseRecord({
        tenantId: 'tenant-1',
        userId: 'user-1',
        input: {
          name: 'Sensitive assistant',
          description: 'Uses privileged secrets in prompts.',
          businessOwner: 'Security',
          useCaseType: 'ENGINEERING_WORKFLOW',
          workflowType: 'ASSISTANT',
          deploymentContext: 'SAAS',
          dataClasses: ['SECRETS'],
          customerDataInvolved: 'NO',
          regulatedDataInvolved: 'NO',
          secretsInvolved: 'YES',
          externalToolAccess: 'NO',
          internetAccess: 'YES',
          humanReviewRequired: true,
          status: 'APPROVED'
        }
      })
    ).rejects.toThrowError('AI_POLICY_BLOCKERS');
  });

  it('creates a durable AI vendor review and applies tenant-scoped list filters', async () => {
    aiVendorReviewCreate.mockResolvedValue({
      id: 'vendor-review-1',
      tenantId: 'tenant-1',
      vendorName: 'SafeAI',
      productName: 'Assistant',
      ownerUserId: 'owner-1',
      assignedReviewerUserId: 'reviewer-1',
      reviewDueAt: new Date('2026-03-14T15:00:00.000Z'),
      matchedPolicyIds: ['policy-1'],
      decisionConditions: ['Enable logging before production use.'],
      requiredControls: ['Enable durable audit logging.'],
      primaryRisks: ['Customer data is in scope.'],
      linkedFindingIds: [],
      linkedRiskIds: [],
      linkedTaskIds: [],
      status: 'DRAFT',
      riskTier: 'HIGH',
      createdBy: 'user-1'
    });
    aiVendorReviewUpdate.mockResolvedValue({
      id: 'vendor-review-1',
      linkedFindingIds: ['finding-2'],
      linkedRiskIds: ['risk-2'],
      linkedTaskIds: ['task-2']
    });
    aiUseCaseFindMany.mockResolvedValue([]);
    aiVendorReviewFindMany.mockResolvedValue([]);

    const vendorRecord = await createAIVendorReviewRecord({
      tenantId: 'tenant-1',
      userId: 'user-1',
      input: {
        vendorName: 'SafeAI',
        productName: 'Assistant',
        primaryUseCase: 'Customer support knowledge assistant',
        deploymentType: 'SAAS',
        authenticationSupport: 'YES',
        loggingSupport: 'YES',
        retentionPolicyStatus: 'KNOWN',
        trainsOnCustomerData: 'NO',
        subprocessorsStatus: 'YES',
        dpaStatus: 'SIGNED',
        securityDocsRequested: true,
        securityDocsReceived: true,
        dataClasses: ['CUSTOMER_DATA'],
        ownerUserId: 'owner-1',
        assignedReviewerUserId: 'reviewer-1',
        reviewDueAt: new Date('2026-03-14T15:00:00.000Z')
      }
    });

    expect(aiVendorReviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        vendorName: 'SafeAI',
        status: 'NEEDS_REVIEW',
        riskTier: 'HIGH'
      })
    });
    expect(syncAIVendorReviewConsequencesMock).toHaveBeenCalled();
    expect(vendorRecord).toEqual({
      id: 'vendor-review-1',
      linkedFindingIds: ['finding-2'],
      linkedRiskIds: ['risk-2'],
      linkedTaskIds: ['task-2']
    });

    await listAIUseCases('tenant-1', {
      status: 'NEEDS_REVIEW',
      riskTier: 'HIGH',
      reviewerUserId: 'reviewer-1'
    });
    await listAIVendorReviews('tenant-1', {
      status: 'DRAFT',
      riskTier: 'CRITICAL',
      reviewerUserId: 'reviewer-2'
    });

    expect(aiUseCaseFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        status: 'NEEDS_REVIEW',
        riskTier: 'HIGH',
        assignedReviewerUserId: 'reviewer-1'
      },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
      take: 200
    });
    expect(aiVendorReviewFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        status: 'DRAFT',
        riskTier: 'CRITICAL',
        assignedReviewerUserId: 'reviewer-2'
      },
      orderBy: [{ updatedAt: 'desc' }, { vendorName: 'asc' }],
      take: 200
    });
  });
});
