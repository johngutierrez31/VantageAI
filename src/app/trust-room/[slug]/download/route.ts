import { renderTrustPacketHtml, renderTrustPacketMarkdown } from '@/lib/trust/package-export';
import { prisma } from '@/lib/db/prisma';
import { getPublicTrustRoom } from '@/lib/trust/public-trust-room';
import { handleRouteError, badRequest, forbidden, notFound } from '@/lib/http';

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') ?? 'html').toLowerCase();
    const roomView = await getPublicTrustRoom({
      slug: params.slug,
      accessToken: searchParams.get('access'),
      grantToken: searchParams.get('grant')
    });

    if (!roomView) return notFound('Trust room not found');
    if (!roomView.canView) return forbidden('Access to this trust room has not been granted');

    let body = '';
    let contentType = 'application/json; charset=utf-8';
    let extension = 'json';

    if (format === 'markdown' || format === 'md') {
      body = renderTrustPacketMarkdown(roomView.roomManifest);
      contentType = 'text/markdown; charset=utf-8';
      extension = 'md';
    } else if (format === 'html') {
      body = renderTrustPacketHtml(roomView.roomManifest);
      contentType = 'text/html; charset=utf-8';
      extension = 'html';
    } else if (format === 'json') {
      body = `${JSON.stringify(roomView.roomManifest, null, 2)}\n`;
    } else {
      return badRequest('Unsupported export format');
    }

    await prisma.trustRoomEngagementEvent.create({
      data: {
        tenantId: roomView.room.tenantId,
        trustRoomId: roomView.room.id,
        trustPacketId: roomView.room.trustPacketId,
        accessRequestId: roomView.approvedRequest?.id ?? null,
        eventType: 'PACKET_DOWNLOADED',
        actorEmail: roomView.approvedRequest?.requesterEmail ?? null,
        actorLabel: roomView.approvedRequest?.requesterName ?? null,
        metadata: { format }
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

    const safeName = roomView.room.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeName || 'trust-room'}.${extension}"`
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
