import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { dispatchIntegrationEvent } from '@/lib/integrations/events';
import { listQuarterlyReviews, prepareQuarterlyReviewRecord } from '@/lib/pulse/quarterly-reviews';
import { quarterlyReviewCreateSchema } from '@/lib/validation/pulse';

export async function GET() {
  try {
    const session = await getSessionContext();
    const reviews = await listQuarterlyReviews(session.tenantId);
    return NextResponse.json(reviews);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    const payload = quarterlyReviewCreateSchema.parse(await request.json());
    const review = await prepareQuarterlyReviewRecord({
      tenantId: session.tenantId,
      userId: session.userId,
      snapshotId: payload.snapshotId,
      roadmapId: payload.roadmapId,
      boardBriefId: payload.boardBriefId,
      reviewDate: payload.reviewDate ? new Date(payload.reviewDate) : undefined
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'quarterly_review',
      entityId: review.id,
      action: 'quarterly_review_prepared',
      metadata: {
        reviewPeriod: review.reviewPeriod,
        status: review.status
      }
    });

    await dispatchIntegrationEvent({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      eventKey: 'quarterly_review_ready',
      title: `${review.reviewPeriod} quarterly review is ready`,
      body: `Pulse prepared the leadership review package in ${review.status.toLowerCase()} status.`,
      href: '/app/pulse',
      entityType: 'quarterly_review',
      entityId: review.id,
      metadata: {
        reviewPeriod: review.reviewPeriod,
        status: review.status
      }
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
