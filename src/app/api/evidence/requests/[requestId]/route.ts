import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { evidenceRequestUpdateSchema } from '@/lib/validation/workflow';
import { handleRouteError, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function PATCH(request: Request, { params }: { params: { requestId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = evidenceRequestUpdateSchema.parse(await request.json());

    const existing = await prisma.evidenceRequest.findFirst({
      where: { id: params.requestId, tenantId: session.tenantId }
    });
    if (!existing) return notFound('Evidence request not found');

    const updated = await prisma.evidenceRequest.update({
      where: { id: existing.id },
      data: {
        status: payload.status,
        assignee: payload.assignee,
        details: payload.details,
        dueDate:
          payload.dueDate === undefined ? undefined : payload.dueDate === null ? null : new Date(payload.dueDate)
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'evidence_request',
      entityId: updated.id,
      action: 'update',
      metadata: {
        status: updated.status,
        dueDate: updated.dueDate
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
