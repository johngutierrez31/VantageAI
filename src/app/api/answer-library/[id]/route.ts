import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { answerLibraryUpdateSchema } from '@/lib/validation/trust';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { assertTenantReviewer } from '@/lib/trust/reviewers';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = answerLibraryUpdateSchema.parse(await request.json());

    const existing = await prisma.approvedAnswer.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      }
    });

    if (!existing) return notFound('Answer library entry not found');

    const owner = await assertTenantReviewer(session.tenantId, payload.ownerUserId);
    const archiveChange = payload.status ? payload.status !== existing.status : false;

    const updated = await prisma.approvedAnswer.update({
      where: { id: existing.id },
      data: {
        questionText: payload.questionText,
        answerText: payload.answerText,
        scope: payload.scope,
        status: payload.status,
        ownerUserId: payload.ownerUserId === undefined ? undefined : payload.ownerUserId,
        archivedAt:
          payload.status === undefined ? undefined : payload.status === 'ARCHIVED' ? new Date() : null,
        archivedBy:
          payload.status === undefined
            ? undefined
            : payload.status === 'ARCHIVED'
              ? session.userId
              : null
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'approved_answer',
      entityId: updated.id,
      action: archiveChange ? 'status_update' : 'update',
      metadata: {
        scope: updated.scope,
        status: updated.status,
        ownerUserId: updated.ownerUserId,
        ownerLabel: owner?.user.name ?? owner?.user.email ?? null
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_REVIEWER') {
      return badRequest('Assigned owner must be an active member of this tenant');
    }
    return handleRouteError(error);
  }
}
