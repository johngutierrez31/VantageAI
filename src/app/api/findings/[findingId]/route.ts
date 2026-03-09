import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { findingUpdateSchema } from '@/lib/validation/workflow';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { assertTenantReviewer } from '@/lib/trust/reviewers';

export async function PATCH(request: Request, { params }: { params: { findingId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = findingUpdateSchema.parse(await request.json());

    const finding = await prisma.finding.findFirst({
      where: {
        id: params.findingId,
        tenantId: session.tenantId
      }
    });

    if (!finding) return notFound('Finding not found');

    const owner = await assertTenantReviewer(session.tenantId, payload.ownerUserId);

    const updated = await prisma.finding.update({
      where: { id: finding.id },
      data: {
        status: payload.status,
        priority: payload.priority,
        ownerUserId: payload.ownerUserId === undefined ? undefined : payload.ownerUserId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'finding',
      entityId: updated.id,
      action: 'update',
      metadata: {
        status: updated.status,
        priority: updated.priority,
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
