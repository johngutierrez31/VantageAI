import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError, badRequest } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { assertTenantReviewer } from '@/lib/trust/reviewers';
import { createAIVendorReviewRecord, listAIVendorReviews } from '@/lib/ai-governance/records';
import { aiVendorReviewCreateSchema } from '@/lib/validation/ai-governance';

export async function GET(request: Request) {
  try {
    const session = await getSessionContext();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim().toLowerCase() ?? '';
    const vendorReviews = await listAIVendorReviews(session.tenantId, {
      status: searchParams.get('status') ?? undefined,
      riskTier: searchParams.get('riskTier') ?? undefined,
      reviewerUserId: searchParams.get('reviewerUserId') ?? undefined
    });

    const filtered = search
      ? vendorReviews.filter((item) =>
          [item.vendorName, item.productName, item.primaryUseCase, item.modelProvider ?? '', item.riskNotes ?? '']
            .join(' ')
            .toLowerCase()
            .includes(search)
        )
      : vendorReviews;

    return NextResponse.json(filtered);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = aiVendorReviewCreateSchema.parse(await request.json());

    if (payload.ownerUserId) {
      await assertTenantReviewer(session.tenantId, payload.ownerUserId);
    }
    if (payload.assignedReviewerUserId) {
      await assertTenantReviewer(session.tenantId, payload.assignedReviewerUserId);
    }

    const vendorReview = await createAIVendorReviewRecord({
      tenantId: session.tenantId,
      userId: session.userId,
      input: {
        ...payload,
        modelProvider: payload.modelProvider ?? null,
        riskNotes: payload.riskNotes ?? null,
        ownerUserId: payload.ownerUserId ?? null,
        assignedReviewerUserId: payload.assignedReviewerUserId ?? null,
        reviewDueAt: payload.reviewDueAt ? new Date(payload.reviewDueAt) : null,
        linkedPolicyIds: payload.linkedPolicyIds ?? [],
        evidenceArtifactIds: payload.evidenceArtifactIds ?? []
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'ai_vendor_review',
      entityId: vendorReview.id,
      action: 'ai_vendor_review_created',
      metadata: {
        status: vendorReview.status,
        riskTier: vendorReview.riskTier
      }
    });

    return NextResponse.json(vendorReview, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_REVIEWER') {
      return badRequest('Owner and reviewer must be active members of this tenant');
    }
    if (error instanceof Error && error.message === 'AI_POLICY_BLOCKERS') {
      return badRequest('Approval blockers remain open. Use NEEDS_REVIEW or APPROVED_WITH_CONDITIONS instead.');
    }
    if (error instanceof Error && error.message === 'AI_POLICY_UNMET_REQUIREMENTS') {
      return badRequest('This vendor review still has unmet policy requirements and cannot be directly approved.');
    }
    return handleRouteError(error);
  }
}
