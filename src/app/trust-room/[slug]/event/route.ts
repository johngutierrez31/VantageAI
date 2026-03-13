import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError, badRequest, notFound, forbidden } from '@/lib/http';
import { trustRoomEngagementEventSchema } from '@/lib/validation/trust';
import { getPublicTrustRoom } from '@/lib/trust/public-trust-room';

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const roomView = await getPublicTrustRoom({
      slug: params.slug,
      accessToken: searchParams.get('access'),
      grantToken: searchParams.get('grant')
    });

    if (!roomView) return notFound('Trust room not found');

    const payload = trustRoomEngagementEventSchema.parse(await request.json());

    if (!roomView.canView && payload.eventType !== 'REQUEST_SUBMITTED') {
      return forbidden('Access to this trust room has not been granted');
    }

    if (payload.eventType === 'REQUEST_SUBMITTED') {
      return badRequest('Request submission events are written by the request workflow');
    }

    const event = await prisma.trustRoomEngagementEvent.create({
      data: {
        tenantId: roomView.room.tenantId,
        trustRoomId: roomView.room.id,
        trustPacketId: roomView.room.trustPacketId,
        accessRequestId: roomView.approvedRequest?.id ?? null,
        eventType: payload.eventType,
        sectionKey: payload.sectionKey ?? null,
        actorEmail: payload.actorEmail ?? roomView.approvedRequest?.requesterEmail ?? null,
        actorLabel: payload.actorLabel ?? roomView.approvedRequest?.requesterName ?? null
      }
    });

    if (roomView.approvedRequest) {
      await prisma.trustRoomAccessRequest.update({
        where: { id: roomView.approvedRequest.id },
        data: {
          lastViewedAt: new Date(),
          viewCount: {
            increment: 1
          },
          status: roomView.approvedRequest.status === 'APPROVED' ? 'FULFILLED' : roomView.approvedRequest.status
        }
      });
    }

    return NextResponse.json({ id: event.id }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
