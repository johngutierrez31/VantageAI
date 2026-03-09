import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { updateRoadmap } from '@/lib/pulse/roadmap';
import { roadmapUpdateSchema } from '@/lib/validation/pulse';
import { writeAuditLog } from '@/lib/audit';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const roadmap = await prisma.pulseRoadmap.findFirstOrThrow({
      where: {
        tenantId: session.tenantId,
        id: params.id
      },
      include: {
        items: {
          orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
        },
        snapshot: {
          include: {
            categoryScores: true
          }
        }
      }
    });

    return NextResponse.json(roadmap);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const payload = roadmapUpdateSchema.parse(await request.json());
    const roadmap = await updateRoadmap({
      tenantId: session.tenantId,
      roadmapId: params.id,
      actorUserId: session.userId,
      status: payload.status,
      reviewerNotes: payload.reviewerNotes
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'pulse_roadmap',
      entityId: roadmap.id,
      action: 'pulse_roadmap_updated',
      metadata: {
        status: roadmap.status
      }
    });

    return NextResponse.json(roadmap);
  } catch (error) {
    return handleRouteError(error);
  }
}
