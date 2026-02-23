import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { exceptionCreateSchema } from '@/lib/validation/workflow';
import { handleRouteError, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getSessionContext();
    const url = new URL(request.url);
    const assessmentId = url.searchParams.get('assessmentId');

    const exceptions = await prisma.exception.findMany({
      where: {
        tenantId: session.tenantId,
        assessmentId: assessmentId ?? undefined
      },
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }]
    });

    return NextResponse.json(exceptions);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ANALYST');
    const payload = exceptionCreateSchema.parse(await request.json());

    const assessment = await prisma.assessment.findFirst({
      where: { id: payload.assessmentId, tenantId: session.tenantId }
    });
    if (!assessment) return notFound('Assessment not found');

    const exception = await prisma.exception.create({
      data: {
        tenantId: session.tenantId,
        assessmentId: payload.assessmentId,
        controlCode: payload.controlCode,
        reason: payload.reason,
        owner: payload.owner,
        approver: payload.approver,
        status: 'ACCEPTED',
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'exception',
      entityId: exception.id,
      action: 'create',
      metadata: {
        assessmentId: exception.assessmentId,
        controlCode: exception.controlCode,
        status: exception.status
      }
    });

    return NextResponse.json(exception, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
