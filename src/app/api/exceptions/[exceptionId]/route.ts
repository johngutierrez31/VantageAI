import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { exceptionUpdateSchema } from '@/lib/validation/workflow';
import { handleRouteError, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function PATCH(request: Request, { params }: { params: { exceptionId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = exceptionUpdateSchema.parse(await request.json());

    const existing = await prisma.exception.findFirst({
      where: { id: params.exceptionId, tenantId: session.tenantId }
    });
    if (!existing) return notFound('Exception not found');

    const nextStatus = payload.status ?? existing.status;
    const nextReason = payload.reason ?? existing.reason;
    const nextApprover = payload.approver ?? existing.approver;
    const nextDueDate =
      payload.dueDate === undefined ? existing.dueDate : payload.dueDate === null ? null : new Date(payload.dueDate);

    if (nextStatus === 'ACCEPTED' && (!nextReason || !nextApprover || !nextDueDate)) {
      return NextResponse.json(
        { error: 'Accepted risk requires reason, approver, and expiry date.' },
        { status: 400 }
      );
    }

    const exception = await prisma.exception.update({
      where: { id: existing.id },
      data: {
        status: payload.status,
        reason: payload.reason,
        owner: payload.owner,
        approver: payload.approver,
        dueDate: payload.dueDate === undefined ? undefined : nextDueDate
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'exception',
      entityId: exception.id,
      action: 'update',
      metadata: { status: exception.status, dueDate: exception.dueDate }
    });

    return NextResponse.json(exception);
  } catch (error) {
    return handleRouteError(error);
  }
}
