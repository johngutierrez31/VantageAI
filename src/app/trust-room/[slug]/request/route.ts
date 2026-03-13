import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { dispatchIntegrationEvent } from '@/lib/integrations/events';
import { trustRoomAccessRequestCreateSchema } from '@/lib/validation/trust';

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const room = await prisma.trustRoom.findFirst({
      where: {
        slug: params.slug,
        status: 'PUBLISHED'
      }
    });

    if (!room) return notFound('Trust room not found');
    if (room.accessMode !== 'REQUEST_ACCESS') {
      return badRequest('This trust room does not accept access requests');
    }

    const payload = trustRoomAccessRequestCreateSchema.parse(await request.json());

    const created = await prisma.trustRoomAccessRequest.create({
      data: {
        tenantId: room.tenantId,
        trustRoomId: room.id,
        trustPacketId: room.trustPacketId,
        trustInboxItemId: room.trustInboxItemId,
        questionnaireUploadId: room.questionnaireUploadId,
        requesterName: payload.requesterName,
        requesterEmail: payload.requesterEmail,
        companyName: payload.companyName ?? null,
        requestReason: payload.requestReason ?? null
      }
    });

    await prisma.trustRoomEngagementEvent.create({
      data: {
        tenantId: room.tenantId,
        trustRoomId: room.id,
        trustPacketId: room.trustPacketId,
        accessRequestId: created.id,
        eventType: 'REQUEST_SUBMITTED',
        actorEmail: created.requesterEmail,
        actorLabel: created.requesterName,
        metadata: {
          companyName: created.companyName,
          acknowledgedTerms: payload.acknowledgedTerms
        }
      }
    });

    await dispatchIntegrationEvent({
      tenantId: room.tenantId,
      eventKey: 'trust_room_request_received',
      title: `Buyer request received for ${room.name}`,
      body: `${created.requesterName} (${created.requesterEmail}) requested access${created.companyName ? ` from ${created.companyName}` : ''}.`,
      href: `/app/trust/rooms`,
      entityType: 'trust_room_request',
      entityId: created.id,
      metadata: {
        trustRoomId: room.id,
        trustPacketId: room.trustPacketId,
        requesterEmail: created.requesterEmail
      }
    });

    return NextResponse.json({ requestId: created.id, status: created.status }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
