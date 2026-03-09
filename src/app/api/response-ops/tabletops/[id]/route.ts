import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { updateTabletopExercise } from '@/lib/response-ops/tabletops';
import { tabletopUpdateSchema } from '@/lib/validation/response-ops';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const tabletop = await prisma.tabletopExercise.findFirstOrThrow({
      where: {
        tenantId: session.tenantId,
        id: params.id
      },
      include: {
        tasks: {
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]
        },
        findings: {
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }]
        }
      }
    });

    const risks = await prisma.riskRegisterItem.findMany({
      where: {
        tenantId: session.tenantId,
        linkedTabletopIds: { has: tabletop.id }
      },
      orderBy: [{ severity: 'desc' }, { targetDueAt: 'asc' }, { updatedAt: 'desc' }]
    });

    return NextResponse.json({
      tabletop,
      risks
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = tabletopUpdateSchema.parse(await request.json());

    const tabletop = await updateTabletopExercise({
      tenantId: session.tenantId,
      tabletopId: params.id,
      actorUserId: session.userId,
      input: {
        ...payload,
        exerciseDate: payload.exerciseDate ? new Date(payload.exerciseDate) : undefined,
        exerciseNotes: payload.exerciseNotes ?? null,
        reviewerNotes: payload.reviewerNotes ?? null
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'tabletop_exercise',
      entityId: tabletop.id,
      action: 'tabletop_updated',
      metadata: {
        status: tabletop.status,
        completedBy: tabletop.completedBy
      }
    });

    return NextResponse.json(tabletop);
  } catch (error) {
    return handleRouteError(error);
  }
}
