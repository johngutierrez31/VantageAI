import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { assertTenantReviewer } from '@/lib/trust/reviewers';
import { aiUseCaseUpdateSchema } from '@/lib/validation/ai-governance';
import { updateAIUseCaseRecord } from '@/lib/ai-governance/records';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const useCase = await prisma.aIUseCase.findFirst({
      where: {
        tenantId: session.tenantId,
        id: params.id
      },
      include: {
        vendorReview: {
          select: {
            id: true,
            vendorName: true,
            productName: true,
            status: true,
            riskTier: true
          }
        }
      }
    });

    if (!useCase) return notFound('AI use case not found');
    return NextResponse.json(useCase);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = aiUseCaseUpdateSchema.parse(await request.json());

    if (payload.assignedReviewerUserId) {
      await assertTenantReviewer(session.tenantId, payload.assignedReviewerUserId);
    }

    const useCase = await updateAIUseCaseRecord({
      tenantId: session.tenantId,
      userId: session.userId,
      useCaseId: params.id,
      input: {
        ...payload,
        department: payload.department ?? undefined,
        vendorName: payload.vendorName ?? undefined,
        vendorReviewId: payload.vendorReviewId ?? undefined,
        modelFamily: payload.modelFamily ?? undefined,
        linkedPolicyIds: payload.linkedPolicyIds,
        evidenceArtifactIds: payload.evidenceArtifactIds,
        assignedReviewerUserId: payload.assignedReviewerUserId ?? undefined,
        reviewDueAt: payload.reviewDueAt === undefined ? undefined : payload.reviewDueAt ? new Date(payload.reviewDueAt) : null,
        reviewerNotes: payload.reviewerNotes ?? undefined,
        decisionConditions: payload.decisionConditions,
        requiredConditions: payload.requiredConditions
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'ai_use_case',
      entityId: useCase.id,
      action:
        payload.status || payload.reviewerNotes || payload.assignedReviewerUserId !== undefined
          ? 'ai_use_case_review_updated'
          : 'ai_use_case_updated',
      metadata: {
        status: useCase.status,
        riskTier: useCase.riskTier,
        assignedReviewerUserId: useCase.assignedReviewerUserId,
        reviewDueAt: useCase.reviewDueAt?.toISOString() ?? null
      }
    });

    return NextResponse.json(useCase);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_REVIEWER') {
      return badRequest('Assigned reviewer must be an active member of this tenant');
    }
    if (error instanceof Error && error.message === 'AI_VENDOR_REVIEW_NOT_FOUND') {
      return badRequest('Linked AI vendor intake was not found for this tenant');
    }
    if (error instanceof Error && error.message === 'AI_POLICY_BLOCKERS') {
      return badRequest('Approval blockers remain open. Use NEEDS_REVIEW or APPROVED_WITH_CONDITIONS instead.');
    }
    if (error instanceof Error && error.message === 'AI_POLICY_UNMET_REQUIREMENTS') {
      return badRequest('This use case still has unmet policy requirements and cannot be directly approved.');
    }
    return handleRouteError(error);
  }
}
