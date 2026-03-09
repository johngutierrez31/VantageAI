import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { assertTenantReviewer } from '@/lib/trust/reviewers';
import { aiVendorReviewUpdateSchema } from '@/lib/validation/ai-governance';
import { updateAIVendorReviewRecord } from '@/lib/ai-governance/records';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const vendorReview = await prisma.aIVendorReview.findFirst({
      where: {
        tenantId: session.tenantId,
        id: params.id
      },
      include: {
        useCases: {
          select: {
            id: true,
            name: true,
            status: true,
            riskTier: true
          },
          orderBy: {
            updatedAt: 'desc'
          }
        }
      }
    });

    if (!vendorReview) return notFound('AI vendor review not found');
    return NextResponse.json(vendorReview);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = aiVendorReviewUpdateSchema.parse(await request.json());

    if (payload.ownerUserId) {
      await assertTenantReviewer(session.tenantId, payload.ownerUserId);
    }
    if (payload.assignedReviewerUserId) {
      await assertTenantReviewer(session.tenantId, payload.assignedReviewerUserId);
    }

    const vendorReview = await updateAIVendorReviewRecord({
      tenantId: session.tenantId,
      userId: session.userId,
      vendorReviewId: params.id,
      input: {
        ...payload,
        modelProvider: payload.modelProvider ?? undefined,
        riskNotes: payload.riskNotes ?? undefined,
        ownerUserId: payload.ownerUserId ?? undefined,
        assignedReviewerUserId: payload.assignedReviewerUserId ?? undefined,
        reviewDueAt: payload.reviewDueAt === undefined ? undefined : payload.reviewDueAt ? new Date(payload.reviewDueAt) : null,
        linkedPolicyIds: payload.linkedPolicyIds,
        evidenceArtifactIds: payload.evidenceArtifactIds,
        reviewerNotes: payload.reviewerNotes ?? undefined,
        decisionConditions: payload.decisionConditions,
        requiredConditions: payload.requiredConditions
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'ai_vendor_review',
      entityId: vendorReview.id,
      action:
        payload.status || payload.reviewerNotes || payload.assignedReviewerUserId !== undefined
          ? 'ai_vendor_review_updated'
          : 'ai_vendor_review_notes_updated',
      metadata: {
        status: vendorReview.status,
        riskTier: vendorReview.riskTier,
        assignedReviewerUserId: vendorReview.assignedReviewerUserId,
        reviewDueAt: vendorReview.reviewDueAt?.toISOString() ?? null
      }
    });

    return NextResponse.json(vendorReview);
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
