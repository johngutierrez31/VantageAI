import type { AIGovernanceStatus, AIUseCase, AIVendorReview } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { syncAIVendorReviewConsequences, syncAIUseCaseConsequences } from '@/lib/ai-governance/consequences';
import { evaluateAIGovernancePolicy } from '@/lib/ai-governance/policy-mapping';

type AIUseCaseInput = {
  name: string;
  description: string;
  businessOwner: string;
  department?: string | null;
  useCaseType: AIUseCase['useCaseType'];
  workflowType: AIUseCase['workflowType'];
  vendorName?: string | null;
  vendorReviewId?: string | null;
  modelFamily?: string | null;
  deploymentContext: AIUseCase['deploymentContext'];
  dataClasses: AIUseCase['dataClasses'];
  customerDataInvolved: AIUseCase['customerDataInvolved'];
  regulatedDataInvolved: AIUseCase['regulatedDataInvolved'];
  secretsInvolved: AIUseCase['secretsInvolved'];
  externalToolAccess: AIUseCase['externalToolAccess'];
  internetAccess: AIUseCase['internetAccess'];
  humanReviewRequired: boolean;
  linkedPolicyIds?: string[];
  evidenceArtifactIds?: string[];
  assignedReviewerUserId?: string | null;
  reviewDueAt?: Date | null;
  reviewerNotes?: string | null;
  status?: AIGovernanceStatus;
  decisionConditions?: string[];
  requiredConditions?: AIUseCase['requiredConditions'];
};

type AIVendorReviewInput = {
  vendorName: string;
  productName: string;
  primaryUseCase: string;
  modelProvider?: string | null;
  deploymentType: AIVendorReview['deploymentType'];
  authenticationSupport: AIVendorReview['authenticationSupport'];
  loggingSupport: AIVendorReview['loggingSupport'];
  retentionPolicyStatus: AIVendorReview['retentionPolicyStatus'];
  trainsOnCustomerData: AIVendorReview['trainsOnCustomerData'];
  subprocessorsStatus: AIVendorReview['subprocessorsStatus'];
  dpaStatus: AIVendorReview['dpaStatus'];
  securityDocsRequested: boolean;
  securityDocsReceived: boolean;
  dataClasses: AIVendorReview['dataClasses'];
  riskNotes?: string | null;
  ownerUserId?: string | null;
  assignedReviewerUserId?: string | null;
  reviewDueAt?: Date | null;
  linkedPolicyIds?: string[];
  evidenceArtifactIds?: string[];
  reviewerNotes?: string | null;
  status?: AIGovernanceStatus;
  decisionConditions?: string[];
  requiredConditions?: AIVendorReview['requiredConditions'];
};

function approvedStatus(status: AIGovernanceStatus | undefined) {
  return status === 'APPROVED' || status === 'APPROVED_WITH_CONDITIONS';
}

function completedReviewStatus(status: AIGovernanceStatus | undefined) {
  return ['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'ARCHIVED'].includes(status ?? '');
}

async function resolveVendorReviewContext(
  tenantId: string,
  vendorReviewId: string | null | undefined
) {
  if (!vendorReviewId) return null;
  const vendorReview = await prisma.aIVendorReview.findFirst({
    where: {
      tenantId,
      id: vendorReviewId
    }
  });
  if (!vendorReview) {
    throw new Error('AI_VENDOR_REVIEW_NOT_FOUND');
  }
  return vendorReview;
}

function defaultGovernanceStatus(args: {
  humanReviewRequired: boolean;
  unmetRequirements: string[];
  approvalBlockers: string[];
  restrictedDataClasses: string[];
}) {
  if (
    args.humanReviewRequired ||
    args.unmetRequirements.length > 0 ||
    args.approvalBlockers.length > 0 ||
    args.restrictedDataClasses.length > 0
  ) {
    return 'NEEDS_REVIEW' as const;
  }
  return 'DRAFT' as const;
}

function assertAllowedApproval(status: AIGovernanceStatus | undefined, blockers: string[], unmetRequirements: string[]) {
  if (status !== 'APPROVED') return;
  if (blockers.length > 0) {
    throw new Error('AI_POLICY_BLOCKERS');
  }
  if (unmetRequirements.length > 0) {
    throw new Error('AI_POLICY_UNMET_REQUIREMENTS');
  }
}

function buildReviewMetadata(status: AIGovernanceStatus | undefined, actorUserId: string) {
  const now = new Date();
  if (!completedReviewStatus(status)) {
    return {
      reviewedBy: undefined,
      reviewedAt: undefined,
      approvedBy: undefined,
      approvedAt: undefined
    };
  }

  return {
    reviewedBy: actorUserId,
    reviewedAt: now,
    approvedBy: approvedStatus(status) ? actorUserId : undefined,
    approvedAt: approvedStatus(status) ? now : undefined
  };
}

export async function createAIUseCaseRecord(args: {
  tenantId: string;
  userId: string;
  input: AIUseCaseInput;
}) {
  const vendorReview = await resolveVendorReviewContext(args.tenantId, args.input.vendorReviewId ?? null);
  const evaluation = await evaluateAIGovernancePolicy({
    useCaseType: args.input.useCaseType,
    workflowType: args.input.workflowType,
    deploymentContext: args.input.deploymentContext,
    dataClasses: args.input.dataClasses,
    linkedPolicyIds: args.input.linkedPolicyIds,
    customerDataInvolved: args.input.customerDataInvolved,
    regulatedDataInvolved: args.input.regulatedDataInvolved,
    secretsInvolved: args.input.secretsInvolved,
    externalToolAccess: args.input.externalToolAccess,
    internetAccess: args.input.internetAccess,
    humanReviewRequired: args.input.humanReviewRequired,
    vendorSignals: args.input.vendorName || vendorReview
      ? {
          hasApprovedVendorReview: vendorReview
            ? vendorReview.status === 'APPROVED' || vendorReview.status === 'APPROVED_WITH_CONDITIONS'
            : false,
          retentionPolicyStatus: vendorReview?.retentionPolicyStatus ?? 'UNKNOWN',
          trainsOnCustomerData: vendorReview?.trainsOnCustomerData ?? 'UNKNOWN',
          subprocessorsStatus: vendorReview?.subprocessorsStatus ?? 'UNKNOWN',
          loggingSupport: vendorReview?.loggingSupport ?? 'UNKNOWN',
          authenticationSupport: vendorReview?.authenticationSupport ?? 'UNKNOWN'
        }
      : undefined
  });

  const status =
    args.input.status ??
    defaultGovernanceStatus({
      humanReviewRequired: evaluation.humanReviewRequired,
      unmetRequirements: evaluation.unmetRequirements,
      approvalBlockers: evaluation.approvalBlockers,
      restrictedDataClasses: evaluation.restrictedDataClasses
    });

  assertAllowedApproval(status, evaluation.approvalBlockers, evaluation.unmetRequirements);
  const reviewMetadata = buildReviewMetadata(status, args.userId);

  const useCase = await prisma.aIUseCase.create({
    data: {
      tenantId: args.tenantId,
      vendorReviewId: args.input.vendorReviewId ?? null,
      name: args.input.name,
      description: args.input.description,
      businessOwner: args.input.businessOwner,
      department: args.input.department ?? null,
      useCaseType: args.input.useCaseType,
      workflowType: args.input.workflowType,
      vendorName: args.input.vendorName ?? vendorReview?.vendorName ?? null,
      modelFamily: args.input.modelFamily ?? null,
      deploymentContext: args.input.deploymentContext,
      dataClasses: args.input.dataClasses,
      allowedDataClasses: evaluation.allowedDataClasses,
      restrictedDataClasses: evaluation.restrictedDataClasses,
      prohibitedDataClasses: evaluation.prohibitedDataClasses,
      customerDataInvolved: args.input.customerDataInvolved,
      regulatedDataInvolved: args.input.regulatedDataInvolved,
      secretsInvolved: args.input.secretsInvolved,
      externalToolAccess: args.input.externalToolAccess,
      internetAccess: args.input.internetAccess,
      humanReviewRequired: evaluation.humanReviewRequired,
      riskTier: evaluation.riskTier,
      status,
      linkedPolicyIds: args.input.linkedPolicyIds ?? [],
      matchedPolicyIds: evaluation.matchedPolicyIds,
      requiredConditions: args.input.requiredConditions ?? evaluation.requiredConditions,
      unmetRequirements: evaluation.unmetRequirements,
      approvalBlockers: evaluation.approvalBlockers,
      decisionConditions: args.input.decisionConditions ?? evaluation.decisionConditions,
      primaryRisks: evaluation.primaryRisks,
      requiredControls: evaluation.requiredControls,
      evidenceArtifactIds: args.input.evidenceArtifactIds ?? [],
      assignedReviewerUserId: args.input.assignedReviewerUserId ?? null,
      reviewDueAt: args.input.reviewDueAt ?? null,
      reviewerNotes: args.input.reviewerNotes ?? null,
      createdBy: args.userId,
      ...reviewMetadata
    }
  });

  const consequences = await syncAIUseCaseConsequences(useCase);
  return prisma.aIUseCase.update({
    where: { id: useCase.id },
    data: {
      linkedFindingIds: consequences.findingIds,
      linkedRiskIds: consequences.riskIds,
      linkedTaskIds: consequences.taskIds
    }
  });
}

export async function updateAIUseCaseRecord(args: {
  tenantId: string;
  userId: string;
  useCaseId: string;
  input: Partial<AIUseCaseInput>;
}) {
  const existing = await prisma.aIUseCase.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.useCaseId
    }
  });

  const vendorReview = await resolveVendorReviewContext(
    args.tenantId,
    args.input.vendorReviewId === undefined ? existing.vendorReviewId : args.input.vendorReviewId
  );
  const mergedInput: AIUseCaseInput = {
    name: args.input.name ?? existing.name,
    description: args.input.description ?? existing.description,
    businessOwner: args.input.businessOwner ?? existing.businessOwner,
    department: args.input.department === undefined ? existing.department : args.input.department,
    useCaseType: args.input.useCaseType ?? existing.useCaseType,
    workflowType: args.input.workflowType ?? existing.workflowType,
    vendorName: args.input.vendorName === undefined ? existing.vendorName : args.input.vendorName,
    vendorReviewId: args.input.vendorReviewId === undefined ? existing.vendorReviewId : args.input.vendorReviewId,
    modelFamily: args.input.modelFamily === undefined ? existing.modelFamily : args.input.modelFamily,
    deploymentContext: args.input.deploymentContext ?? existing.deploymentContext,
    dataClasses: args.input.dataClasses ?? existing.dataClasses,
    customerDataInvolved: args.input.customerDataInvolved ?? existing.customerDataInvolved,
    regulatedDataInvolved: args.input.regulatedDataInvolved ?? existing.regulatedDataInvolved,
    secretsInvolved: args.input.secretsInvolved ?? existing.secretsInvolved,
    externalToolAccess: args.input.externalToolAccess ?? existing.externalToolAccess,
    internetAccess: args.input.internetAccess ?? existing.internetAccess,
    humanReviewRequired: args.input.humanReviewRequired ?? existing.humanReviewRequired,
    linkedPolicyIds: args.input.linkedPolicyIds ?? existing.linkedPolicyIds,
    evidenceArtifactIds: args.input.evidenceArtifactIds ?? existing.evidenceArtifactIds,
    assignedReviewerUserId:
      args.input.assignedReviewerUserId === undefined ? existing.assignedReviewerUserId : args.input.assignedReviewerUserId,
    reviewDueAt: args.input.reviewDueAt === undefined ? existing.reviewDueAt : args.input.reviewDueAt,
    reviewerNotes: args.input.reviewerNotes === undefined ? existing.reviewerNotes : args.input.reviewerNotes,
    status: args.input.status ?? existing.status,
    decisionConditions: args.input.decisionConditions ?? existing.decisionConditions,
    requiredConditions: args.input.requiredConditions ?? existing.requiredConditions
  };

  const evaluation = await evaluateAIGovernancePolicy({
    useCaseType: mergedInput.useCaseType,
    workflowType: mergedInput.workflowType,
    deploymentContext: mergedInput.deploymentContext,
    dataClasses: mergedInput.dataClasses,
    linkedPolicyIds: mergedInput.linkedPolicyIds,
    customerDataInvolved: mergedInput.customerDataInvolved,
    regulatedDataInvolved: mergedInput.regulatedDataInvolved,
    secretsInvolved: mergedInput.secretsInvolved,
    externalToolAccess: mergedInput.externalToolAccess,
    internetAccess: mergedInput.internetAccess,
    humanReviewRequired: mergedInput.humanReviewRequired,
    vendorSignals: mergedInput.vendorName || vendorReview
      ? {
          hasApprovedVendorReview: vendorReview
            ? vendorReview.status === 'APPROVED' || vendorReview.status === 'APPROVED_WITH_CONDITIONS'
            : false,
          retentionPolicyStatus: vendorReview?.retentionPolicyStatus ?? 'UNKNOWN',
          trainsOnCustomerData: vendorReview?.trainsOnCustomerData ?? 'UNKNOWN',
          subprocessorsStatus: vendorReview?.subprocessorsStatus ?? 'UNKNOWN',
          loggingSupport: vendorReview?.loggingSupport ?? 'UNKNOWN',
          authenticationSupport: vendorReview?.authenticationSupport ?? 'UNKNOWN'
        }
      : undefined
  });

  assertAllowedApproval(mergedInput.status, evaluation.approvalBlockers, evaluation.unmetRequirements);
  const reviewMetadata =
    args.input.status === undefined ? {} : buildReviewMetadata(mergedInput.status, args.userId);

  const updated = await prisma.aIUseCase.update({
    where: { id: existing.id },
    data: {
      name: mergedInput.name,
      description: mergedInput.description,
      businessOwner: mergedInput.businessOwner,
      department: mergedInput.department ?? null,
      useCaseType: mergedInput.useCaseType,
      workflowType: mergedInput.workflowType,
      vendorName: mergedInput.vendorName ?? vendorReview?.vendorName ?? null,
      vendorReviewId: mergedInput.vendorReviewId ?? null,
      modelFamily: mergedInput.modelFamily ?? null,
      deploymentContext: mergedInput.deploymentContext,
      dataClasses: mergedInput.dataClasses,
      allowedDataClasses: evaluation.allowedDataClasses,
      restrictedDataClasses: evaluation.restrictedDataClasses,
      prohibitedDataClasses: evaluation.prohibitedDataClasses,
      customerDataInvolved: mergedInput.customerDataInvolved,
      regulatedDataInvolved: mergedInput.regulatedDataInvolved,
      secretsInvolved: mergedInput.secretsInvolved,
      externalToolAccess: mergedInput.externalToolAccess,
      internetAccess: mergedInput.internetAccess,
      humanReviewRequired: evaluation.humanReviewRequired,
      riskTier: evaluation.riskTier,
      status: mergedInput.status,
      linkedPolicyIds: mergedInput.linkedPolicyIds ?? [],
      matchedPolicyIds: evaluation.matchedPolicyIds,
      requiredConditions: mergedInput.requiredConditions ?? evaluation.requiredConditions,
      unmetRequirements: evaluation.unmetRequirements,
      approvalBlockers: evaluation.approvalBlockers,
      decisionConditions: mergedInput.decisionConditions ?? evaluation.decisionConditions,
      primaryRisks: evaluation.primaryRisks,
      requiredControls: evaluation.requiredControls,
      evidenceArtifactIds: mergedInput.evidenceArtifactIds ?? [],
      assignedReviewerUserId: mergedInput.assignedReviewerUserId ?? null,
      reviewDueAt: mergedInput.reviewDueAt ?? null,
      reviewerNotes: mergedInput.reviewerNotes ?? null,
      ...reviewMetadata
    }
  });

  const consequences = await syncAIUseCaseConsequences(updated);
  return prisma.aIUseCase.update({
    where: { id: updated.id },
    data: {
      linkedFindingIds: consequences.findingIds,
      linkedRiskIds: consequences.riskIds,
      linkedTaskIds: consequences.taskIds
    }
  });
}

export async function createAIVendorReviewRecord(args: {
  tenantId: string;
  userId: string;
  input: AIVendorReviewInput;
}) {
  const evaluation = await evaluateAIGovernancePolicy({
    deploymentContext: args.input.deploymentType,
    dataClasses: args.input.dataClasses,
    linkedPolicyIds: args.input.linkedPolicyIds,
    customerDataInvolved: args.input.dataClasses.includes('CUSTOMER_DATA') || args.input.dataClasses.includes('CUSTOMER_CONTENT') ? 'YES' : 'UNKNOWN',
    regulatedDataInvolved:
      args.input.dataClasses.some((value) => value === 'PHI' || value === 'PCI' || value === 'PII') ? 'YES' : 'UNKNOWN',
    secretsInvolved: args.input.dataClasses.includes('SECRETS') ? 'YES' : 'UNKNOWN',
    externalToolAccess: 'UNKNOWN',
    internetAccess: args.input.deploymentType === 'INTERNAL' || args.input.deploymentType === 'LOCAL_MODEL' ? 'NO' : 'UNKNOWN',
    humanReviewRequired: true,
    vendorSignals: {
      hasApprovedVendorReview: false,
      retentionPolicyStatus: args.input.retentionPolicyStatus,
      trainsOnCustomerData: args.input.trainsOnCustomerData,
      subprocessorsStatus: args.input.subprocessorsStatus,
      loggingSupport: args.input.loggingSupport,
      authenticationSupport: args.input.authenticationSupport
    }
  });

  const status =
    args.input.status ??
    defaultGovernanceStatus({
      humanReviewRequired: true,
      unmetRequirements: evaluation.unmetRequirements,
      approvalBlockers: evaluation.approvalBlockers,
      restrictedDataClasses: evaluation.restrictedDataClasses
    });

  assertAllowedApproval(status, evaluation.approvalBlockers, evaluation.unmetRequirements);
  const reviewMetadata = buildReviewMetadata(status, args.userId);

  const vendorReview = await prisma.aIVendorReview.create({
    data: {
      tenantId: args.tenantId,
      vendorName: args.input.vendorName,
      productName: args.input.productName,
      primaryUseCase: args.input.primaryUseCase,
      modelProvider: args.input.modelProvider ?? null,
      deploymentType: args.input.deploymentType,
      authenticationSupport: args.input.authenticationSupport,
      loggingSupport: args.input.loggingSupport,
      retentionPolicyStatus: args.input.retentionPolicyStatus,
      trainsOnCustomerData: args.input.trainsOnCustomerData,
      subprocessorsStatus: args.input.subprocessorsStatus,
      dpaStatus: args.input.dpaStatus,
      securityDocsRequested: args.input.securityDocsRequested,
      securityDocsReceived: args.input.securityDocsReceived,
      dataClasses: args.input.dataClasses,
      linkedPolicyIds: args.input.linkedPolicyIds ?? [],
      matchedPolicyIds: evaluation.matchedPolicyIds,
      requiredConditions: args.input.requiredConditions ?? evaluation.requiredConditions,
      unmetRequirements: evaluation.unmetRequirements,
      approvalBlockers: evaluation.approvalBlockers,
      decisionConditions: args.input.decisionConditions ?? evaluation.decisionConditions,
      riskNotes: args.input.riskNotes ?? null,
      primaryRisks: evaluation.primaryRisks,
      requiredControls: evaluation.requiredControls,
      ownerUserId: args.input.ownerUserId ?? null,
      assignedReviewerUserId: args.input.assignedReviewerUserId ?? null,
      reviewDueAt: args.input.reviewDueAt ?? null,
      reviewerNotes: args.input.reviewerNotes ?? null,
      riskTier: evaluation.riskTier,
      status,
      evidenceArtifactIds: args.input.evidenceArtifactIds ?? [],
      createdBy: args.userId,
      ...reviewMetadata
    }
  });

  const consequences = await syncAIVendorReviewConsequences(vendorReview);
  return prisma.aIVendorReview.update({
    where: { id: vendorReview.id },
    data: {
      linkedFindingIds: consequences.findingIds,
      linkedRiskIds: consequences.riskIds,
      linkedTaskIds: consequences.taskIds
    }
  });
}

export async function updateAIVendorReviewRecord(args: {
  tenantId: string;
  userId: string;
  vendorReviewId: string;
  input: Partial<AIVendorReviewInput>;
}) {
  const existing = await prisma.aIVendorReview.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.vendorReviewId
    }
  });

  const mergedInput: AIVendorReviewInput = {
    vendorName: args.input.vendorName ?? existing.vendorName,
    productName: args.input.productName ?? existing.productName,
    primaryUseCase: args.input.primaryUseCase ?? existing.primaryUseCase,
    modelProvider: args.input.modelProvider === undefined ? existing.modelProvider : args.input.modelProvider,
    deploymentType: args.input.deploymentType ?? existing.deploymentType,
    authenticationSupport: args.input.authenticationSupport ?? existing.authenticationSupport,
    loggingSupport: args.input.loggingSupport ?? existing.loggingSupport,
    retentionPolicyStatus: args.input.retentionPolicyStatus ?? existing.retentionPolicyStatus,
    trainsOnCustomerData: args.input.trainsOnCustomerData ?? existing.trainsOnCustomerData,
    subprocessorsStatus: args.input.subprocessorsStatus ?? existing.subprocessorsStatus,
    dpaStatus: args.input.dpaStatus ?? existing.dpaStatus,
    securityDocsRequested: args.input.securityDocsRequested ?? existing.securityDocsRequested,
    securityDocsReceived: args.input.securityDocsReceived ?? existing.securityDocsReceived,
    dataClasses: args.input.dataClasses ?? existing.dataClasses,
    riskNotes: args.input.riskNotes === undefined ? existing.riskNotes : args.input.riskNotes,
    ownerUserId: args.input.ownerUserId === undefined ? existing.ownerUserId : args.input.ownerUserId,
    assignedReviewerUserId:
      args.input.assignedReviewerUserId === undefined ? existing.assignedReviewerUserId : args.input.assignedReviewerUserId,
    reviewDueAt: args.input.reviewDueAt === undefined ? existing.reviewDueAt : args.input.reviewDueAt,
    linkedPolicyIds: args.input.linkedPolicyIds ?? existing.linkedPolicyIds,
    evidenceArtifactIds: args.input.evidenceArtifactIds ?? existing.evidenceArtifactIds,
    reviewerNotes: args.input.reviewerNotes === undefined ? existing.reviewerNotes : args.input.reviewerNotes,
    status: args.input.status ?? existing.status,
    decisionConditions: args.input.decisionConditions ?? existing.decisionConditions,
    requiredConditions: args.input.requiredConditions ?? existing.requiredConditions
  };

  const evaluation = await evaluateAIGovernancePolicy({
    deploymentContext: mergedInput.deploymentType,
    dataClasses: mergedInput.dataClasses,
    linkedPolicyIds: mergedInput.linkedPolicyIds,
    customerDataInvolved:
      mergedInput.dataClasses.includes('CUSTOMER_DATA') || mergedInput.dataClasses.includes('CUSTOMER_CONTENT')
        ? 'YES'
        : 'UNKNOWN',
    regulatedDataInvolved:
      mergedInput.dataClasses.some((value) => value === 'PHI' || value === 'PCI' || value === 'PII')
        ? 'YES'
        : 'UNKNOWN',
    secretsInvolved: mergedInput.dataClasses.includes('SECRETS') ? 'YES' : 'UNKNOWN',
    externalToolAccess: 'UNKNOWN',
    internetAccess:
      mergedInput.deploymentType === 'INTERNAL' || mergedInput.deploymentType === 'LOCAL_MODEL' ? 'NO' : 'UNKNOWN',
    humanReviewRequired: true,
    vendorSignals: {
      hasApprovedVendorReview: approvedStatus(mergedInput.status),
      retentionPolicyStatus: mergedInput.retentionPolicyStatus,
      trainsOnCustomerData: mergedInput.trainsOnCustomerData,
      subprocessorsStatus: mergedInput.subprocessorsStatus,
      loggingSupport: mergedInput.loggingSupport,
      authenticationSupport: mergedInput.authenticationSupport
    }
  });

  assertAllowedApproval(mergedInput.status, evaluation.approvalBlockers, evaluation.unmetRequirements);
  const reviewMetadata =
    args.input.status === undefined ? {} : buildReviewMetadata(mergedInput.status, args.userId);

  const updated = await prisma.aIVendorReview.update({
    where: { id: existing.id },
    data: {
      vendorName: mergedInput.vendorName,
      productName: mergedInput.productName,
      primaryUseCase: mergedInput.primaryUseCase,
      modelProvider: mergedInput.modelProvider ?? null,
      deploymentType: mergedInput.deploymentType,
      authenticationSupport: mergedInput.authenticationSupport,
      loggingSupport: mergedInput.loggingSupport,
      retentionPolicyStatus: mergedInput.retentionPolicyStatus,
      trainsOnCustomerData: mergedInput.trainsOnCustomerData,
      subprocessorsStatus: mergedInput.subprocessorsStatus,
      dpaStatus: mergedInput.dpaStatus,
      securityDocsRequested: mergedInput.securityDocsRequested,
      securityDocsReceived: mergedInput.securityDocsReceived,
      dataClasses: mergedInput.dataClasses,
      linkedPolicyIds: mergedInput.linkedPolicyIds ?? [],
      matchedPolicyIds: evaluation.matchedPolicyIds,
      requiredConditions: mergedInput.requiredConditions ?? evaluation.requiredConditions,
      unmetRequirements: evaluation.unmetRequirements,
      approvalBlockers: evaluation.approvalBlockers,
      decisionConditions: mergedInput.decisionConditions ?? evaluation.decisionConditions,
      riskNotes: mergedInput.riskNotes ?? null,
      primaryRisks: evaluation.primaryRisks,
      requiredControls: evaluation.requiredControls,
      ownerUserId: mergedInput.ownerUserId ?? null,
      assignedReviewerUserId: mergedInput.assignedReviewerUserId ?? null,
      reviewDueAt: mergedInput.reviewDueAt ?? null,
      reviewerNotes: mergedInput.reviewerNotes ?? null,
      riskTier: evaluation.riskTier,
      status: mergedInput.status,
      evidenceArtifactIds: mergedInput.evidenceArtifactIds ?? [],
      ...reviewMetadata
    }
  });

  const consequences = await syncAIVendorReviewConsequences(updated);
  return prisma.aIVendorReview.update({
    where: { id: updated.id },
    data: {
      linkedFindingIds: consequences.findingIds,
      linkedRiskIds: consequences.riskIds,
      linkedTaskIds: consequences.taskIds
    }
  });
}

export async function listAIGovernanceReviewItems(tenantId: string) {
  const [useCases, vendorReviews] = await Promise.all([
    prisma.aIUseCase.findMany({
      where: { tenantId },
      orderBy: [{ reviewDueAt: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        status: true,
        riskTier: true,
        businessOwner: true,
        assignedReviewerUserId: true,
        reviewDueAt: true
      }
    }),
    prisma.aIVendorReview.findMany({
      where: { tenantId },
      orderBy: [{ reviewDueAt: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        vendorName: true,
        productName: true,
        status: true,
        riskTier: true,
        ownerUserId: true,
        assignedReviewerUserId: true,
        reviewDueAt: true
      }
    })
  ]);

  return [
    ...useCases.map((item) => ({
      id: item.id,
      type: 'AI_USE_CASE' as const,
      title: item.name,
      status: item.status,
      riskTier: item.riskTier,
      ownerRef: item.businessOwner,
      assignedReviewerUserId: item.assignedReviewerUserId,
      reviewDueAt: item.reviewDueAt?.toISOString() ?? null,
      href: `/app/ai-governance/use-cases/${item.id}`
    })),
    ...vendorReviews.map((item) => ({
      id: item.id,
      type: 'AI_VENDOR_REVIEW' as const,
      title: `${item.vendorName} - ${item.productName}`,
      status: item.status,
      riskTier: item.riskTier,
      ownerRef: item.ownerUserId,
      assignedReviewerUserId: item.assignedReviewerUserId,
      reviewDueAt: item.reviewDueAt?.toISOString() ?? null,
      href: `/app/ai-governance/vendors/${item.id}`
    }))
  ];
}

export type AIUseCaseListFilters = {
  status?: string;
  riskTier?: string;
  reviewerUserId?: string;
};

export async function listAIUseCases(tenantId: string, filters: AIUseCaseListFilters = {}) {
  return prisma.aIUseCase.findMany({
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status as AIUseCase['status'] } : {}),
      ...(filters.riskTier ? { riskTier: filters.riskTier as AIUseCase['riskTier'] } : {}),
      ...(filters.reviewerUserId ? { assignedReviewerUserId: filters.reviewerUserId } : {})
    },
    orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    take: 200
  });
}

export type AIVendorReviewListFilters = {
  status?: string;
  riskTier?: string;
  reviewerUserId?: string;
};

export async function listAIVendorReviews(tenantId: string, filters: AIVendorReviewListFilters = {}) {
  return prisma.aIVendorReview.findMany({
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status as AIVendorReview['status'] } : {}),
      ...(filters.riskTier ? { riskTier: filters.riskTier as AIVendorReview['riskTier'] } : {}),
      ...(filters.reviewerUserId ? { assignedReviewerUserId: filters.reviewerUserId } : {})
    },
    orderBy: [{ updatedAt: 'desc' }, { vendorName: 'asc' }],
    take: 200
  });
}
