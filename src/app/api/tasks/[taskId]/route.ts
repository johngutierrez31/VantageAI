import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { taskUpdateSchema } from '@/lib/validation/workflow';
import { handleRouteError, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function PATCH(request: Request, { params }: { params: { taskId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ANALYST');
    const payload = taskUpdateSchema.parse(await request.json());

    const task = await prisma.task.findFirst({
      where: { id: params.taskId, tenantId: session.tenantId }
    });
    if (!task) return notFound('Task not found');

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: payload.status,
        assignee: payload.assignee,
        dueDate:
          payload.dueDate === undefined ? undefined : payload.dueDate === null ? null : new Date(payload.dueDate),
        priority: payload.priority
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'task',
      entityId: updated.id,
      action: 'update',
      metadata: {
        status: updated.status,
        assignee: updated.assignee
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
