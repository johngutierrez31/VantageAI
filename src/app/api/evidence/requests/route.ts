import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { evidenceRequestCreateSchema } from '@/lib/validation/workflow';
import { handleRouteError } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getSessionContext();
    const url = new URL(request.url);
    const assessmentId = url.searchParams.get('assessmentId');

    const requests = await prisma.evidenceRequest.findMany({
      where: {
        tenantId: session.tenantId,
        assessmentId: assessmentId ?? undefined
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }]
    });

    return NextResponse.json(requests);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ANALYST');
    const payload = evidenceRequestCreateSchema.parse(await request.json());

    const requestRecord = await prisma.evidenceRequest.create({
      data: {
        tenantId: session.tenantId,
        assessmentId: payload.assessmentId,
        title: payload.title,
        details: payload.details,
        assignee: payload.assignee,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        createdBy: session.userId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'evidence_request',
      entityId: requestRecord.id,
      action: 'create',
      metadata: {
        assessmentId: requestRecord.assessmentId,
        status: requestRecord.status
      }
    });

    return NextResponse.json(requestRecord, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
