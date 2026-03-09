import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { quarterlyReviewUpdateSchema } from '@/lib/validation/pulse';
import { updateQuarterlyReview } from '@/lib/pulse/quarterly-reviews';
import { writeAuditLog } from '@/lib/audit';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const review = await prisma.quarterlyReview.findFirstOrThrow({
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
        },
        boardBrief: true
      }
    });

    const risks = review.topRiskIds.length
      ? await prisma.riskRegisterItem.findMany({
          where: {
            tenantId: session.tenantId,
            id: { in: review.topRiskIds }
          }
        })
      : [];

    return NextResponse.json({
      ...review,
      risks
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const payload = quarterlyReviewUpdateSchema.parse(await request.json());
    const review = await updateQuarterlyReview({
      tenantId: session.tenantId,
      reviewId: params.id,
      actorUserId: session.userId,
      attendeeNames: payload.attendeeNames,
      notes: payload.notes,
      decisionsMade: payload.decisionsMade,
      followUpActions: payload.followUpActions,
      status: payload.status
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'quarterly_review',
      entityId: review.id,
      action: 'quarterly_review_updated',
      metadata: {
        status: review.status,
        attendeeCount: review.attendeeNames.length
      }
    });

    return NextResponse.json(review);
  } catch (error) {
    return handleRouteError(error);
  }
}
