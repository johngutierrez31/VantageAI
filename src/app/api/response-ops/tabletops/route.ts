import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { createTabletopExercise } from '@/lib/response-ops/tabletops';
import { tabletopCreateSchema } from '@/lib/validation/response-ops';

export async function GET(request: Request) {
  try {
    const session = await getSessionContext();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim();

    const tabletops = await prisma.tabletopExercise.findMany({
      where: {
        tenantId: session.tenantId,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { scenarioSummary: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {}),
        ...(searchParams.get('status') ? { status: searchParams.get('status') as never } : {}),
        ...(searchParams.get('scenarioType') ? { scenarioType: searchParams.get('scenarioType') as never } : {})
      },
      orderBy: [{ exerciseDate: 'desc' }, { updatedAt: 'desc' }],
      take: 40
    });

    return NextResponse.json(tabletops);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = tabletopCreateSchema.parse(await request.json());

    const tabletop = await createTabletopExercise({
      tenantId: session.tenantId,
      userId: session.userId,
      input: {
        ...payload,
        exerciseDate: payload.exerciseDate ? new Date(payload.exerciseDate) : undefined,
        exerciseNotes: payload.exerciseNotes ?? null
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'tabletop_exercise',
      entityId: tabletop.id,
      action: 'tabletop_created',
      metadata: {
        scenarioType: tabletop.scenarioType,
        status: tabletop.status
      }
    });

    return NextResponse.json(tabletop, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
