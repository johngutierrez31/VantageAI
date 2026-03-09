import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { evidenceMapUpdateSchema } from '@/lib/validation/trust';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { assertTenantReviewer } from '@/lib/trust/reviewers';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = evidenceMapUpdateSchema.parse(await request.json());

    const evidenceMap = await prisma.evidenceMap.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      }
    });

    if (!evidenceMap) return notFound('Evidence map not found');

    const reviewer = await assertTenantReviewer(session.tenantId, payload.assignedReviewerUserId);

    const updated = await prisma.evidenceMap.update({
      where: { id: evidenceMap.id },
      data: {
        status: payload.status,
        assignedReviewerUserId:
          payload.assignedReviewerUserId === undefined ? undefined : payload.assignedReviewerUserId,
        reviewDueAt:
          payload.reviewDueAt === undefined ? undefined : payload.reviewDueAt === null ? null : new Date(payload.reviewDueAt),
        reviewerNotes:
          payload.reviewerNotes === undefined ? undefined : payload.reviewerNotes,
        reviewedBy: payload.status === 'APPROVED' ? session.userId : payload.status === 'ARCHIVED' ? session.userId : undefined,
        reviewedAt:
          payload.status === 'APPROVED' || payload.status === 'ARCHIVED' ? new Date() : undefined
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'evidence_map',
      entityId: updated.id,
      action: payload.status ? 'review_update' : 'assign_review',
      metadata: {
        status: updated.status,
        assignedReviewerUserId: updated.assignedReviewerUserId,
        assignedReviewerLabel: reviewer?.user.name ?? reviewer?.user.email ?? null,
        reviewDueAt: updated.reviewDueAt?.toISOString() ?? null
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_REVIEWER') {
      return badRequest('Assigned reviewer must be an active member of this tenant');
    }
    return handleRouteError(error);
  }
}
