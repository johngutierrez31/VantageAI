import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { taskCreateSchema } from '@/lib/validation/workflow';
import { handleRouteError } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getSessionContext();
    const tasks = await prisma.task.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }]
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = taskCreateSchema.parse(await request.json());

    const task = await prisma.task.create({
      data: {
        tenantId: session.tenantId,
        assessmentId: payload.assessmentId,
        title: payload.title,
        controlCode: payload.controlCode,
        description: payload.description,
        assignee: payload.assignee,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        priority: payload.priority ?? 'MEDIUM',
        createdBy: session.userId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'task',
      entityId: task.id,
      action: 'create',
      metadata: {
        assessmentId: task.assessmentId,
        controlCode: task.controlCode,
        priority: task.priority
      }
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

