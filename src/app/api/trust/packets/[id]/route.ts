import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { trustPacketUpdateSchema } from '@/lib/validation/trust';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { assertTenantReviewer } from '@/lib/trust/reviewers';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = trustPacketUpdateSchema.parse(await request.json());

    const packet = await prisma.trustPacket.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      }
    });

    if (!packet) return notFound('Trust packet not found');

    const reviewer = await assertTenantReviewer(session.tenantId, payload.assignedReviewerUserId);
    const now = new Date();

    const updated = await prisma.trustPacket.update({
      where: { id: packet.id },
      data: {
        status: payload.status,
        reviewerRequired:
          payload.status === undefined
            ? undefined
            : payload.status === 'READY_TO_SHARE' || payload.status === 'SHARED'
              ? false
              : undefined,
        assignedReviewerUserId:
          payload.assignedReviewerUserId === undefined ? undefined : payload.assignedReviewerUserId,
        reviewDueAt:
          payload.reviewDueAt === undefined ? undefined : payload.reviewDueAt === null ? null : new Date(payload.reviewDueAt),
        reviewerNotes: payload.reviewerNotes === undefined ? undefined : payload.reviewerNotes,
        reviewedBy:
          payload.status === 'READY_TO_SHARE' || payload.status === 'SHARED' ? session.userId : undefined,
        reviewedAt:
          payload.status === 'READY_TO_SHARE' || payload.status === 'SHARED' ? now : undefined,
        approvedContactName:
          payload.approvedContactName === undefined ? undefined : payload.approvedContactName,
        approvedContactEmail:
          payload.approvedContactEmail === undefined ? undefined : payload.approvedContactEmail
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'trust_packet',
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
