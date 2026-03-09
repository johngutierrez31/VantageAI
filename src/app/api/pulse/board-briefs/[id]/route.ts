import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { boardBriefUpdateSchema } from '@/lib/validation/pulse';
import { updateBoardBrief } from '@/lib/pulse/board-briefs';
import { writeAuditLog } from '@/lib/audit';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const brief = await prisma.boardBrief.findFirstOrThrow({
      where: {
        tenantId: session.tenantId,
        id: params.id
      },
      include: {
        snapshot: {
          include: {
            categoryScores: true
          }
        },
        roadmap: {
          include: {
            items: {
              orderBy: [{ horizon: 'asc' }, { dueAt: 'asc' }]
            }
          }
        }
      }
    });

    const risks = await prisma.riskRegisterItem.findMany({
      where: {
        tenantId: session.tenantId,
        id: { in: brief.topRiskIds }
      }
    });

    return NextResponse.json({
      ...brief,
      risks
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const payload = boardBriefUpdateSchema.parse(await request.json());
    const brief = await updateBoardBrief({
      tenantId: session.tenantId,
      boardBriefId: params.id,
      actorUserId: session.userId,
      status: payload.status,
      reviewerNotes: payload.reviewerNotes
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'board_brief',
      entityId: brief.id,
      action: 'board_brief_updated',
      metadata: {
        status: brief.status
      }
    });

    return NextResponse.json(brief);
  } catch (error) {
    return handleRouteError(error);
  }
}
