import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError, badRequest } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { assertTenantReviewer } from '@/lib/trust/reviewers';
import { createAIUseCaseRecord, listAIUseCases } from '@/lib/ai-governance/records';
import { aiUseCaseCreateSchema } from '@/lib/validation/ai-governance';

export async function GET(request: Request) {
  try {
    const session = await getSessionContext();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim().toLowerCase() ?? '';
    const useCases = await listAIUseCases(session.tenantId, {
      status: searchParams.get('status') ?? undefined,
      riskTier: searchParams.get('riskTier') ?? undefined,
      reviewerUserId: searchParams.get('reviewerUserId') ?? undefined
    });

    const filtered = search
      ? useCases.filter((item) =>
          [item.name, item.description, item.businessOwner, item.department ?? '', item.vendorName ?? '']
            .join(' ')
            .toLowerCase()
            .includes(search)
        )
      : useCases;

    return NextResponse.json(filtered);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = aiUseCaseCreateSchema.parse(await request.json());

    if (payload.assignedReviewerUserId) {
      await assertTenantReviewer(session.tenantId, payload.assignedReviewerUserId);
    }

    const useCase = await createAIUseCaseRecord({
      tenantId: session.tenantId,
      userId: session.userId,
      input: {
        ...payload,
        vendorName: payload.vendorName ?? null,
        vendorReviewId: payload.vendorReviewId ?? null,
        modelFamily: payload.modelFamily ?? null,
        department: payload.department ?? null,
        linkedPolicyIds: payload.linkedPolicyIds ?? [],
        evidenceArtifactIds: payload.evidenceArtifactIds ?? [],
        assignedReviewerUserId: payload.assignedReviewerUserId ?? null,
        reviewDueAt: payload.reviewDueAt ? new Date(payload.reviewDueAt) : null
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'ai_use_case',
      entityId: useCase.id,
      action: 'ai_use_case_created',
      metadata: {
        status: useCase.status,
        riskTier: useCase.riskTier,
        vendorReviewId: useCase.vendorReviewId
      }
    });

    return NextResponse.json(useCase, { status: 201 });
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
