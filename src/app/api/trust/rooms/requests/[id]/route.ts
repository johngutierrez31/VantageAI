import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { authBaseUrl } from '@/lib/auth/options';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError, notFound } from '@/lib/http';
import { trustRoomAccessRequestUpdateSchema } from '@/lib/validation/trust';
import { buildTrustRoomShareUrl, generateTrustRoomToken, hashTrustRoomToken } from '@/lib/trust/trust-rooms';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = trustRoomAccessRequestUpdateSchema.parse(await request.json());

    const accessRequest = await prisma.trustRoomAccessRequest.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      },
      include: {
        trustRoom: {
          select: {
            slug: true,
            accessMode: true
          }
        }
      }
    });

    if (!accessRequest) return notFound('Trust room request not found');

    const shouldIssueGrant =
      payload.status === 'APPROVED' || payload.rotateGrantToken || accessRequest.status !== 'APPROVED' && payload.status === 'FULFILLED';
    const grantToken = shouldIssueGrant ? generateTrustRoomToken() : null;
    const now = new Date();

    const updated = await prisma.trustRoomAccessRequest.update({
      where: { id: accessRequest.id },
      data: {
        status: payload.status,
        assignedOwnerUserId:
          payload.assignedOwnerUserId === undefined ? undefined : payload.assignedOwnerUserId,
        internalNotes: payload.internalNotes === undefined ? undefined : payload.internalNotes,
        approvedAccessTokenHash:
          payload.status === 'DENIED'
            ? null
            : grantToken
              ? hashTrustRoomToken(grantToken)
              : undefined,
        approvedAt:
          payload.status === 'APPROVED' || payload.status === 'FULFILLED'
            ? accessRequest.approvedAt ?? now
            : payload.status === 'DENIED'
              ? null
              : undefined,
        respondedAt: payload.status ? now : undefined,
        expiresAt:
          payload.expiresAt === undefined
            ? undefined
            : payload.expiresAt === null
              ? null
              : new Date(payload.expiresAt)
      }
    });

    if (payload.status === 'APPROVED' || payload.status === 'FULFILLED') {
      await prisma.trustRoomEngagementEvent.create({
        data: {
          tenantId: session.tenantId,
          trustRoomId: accessRequest.trustRoomId,
          trustPacketId: accessRequest.trustPacketId,
          accessRequestId: accessRequest.id,
          eventType: 'ACCESS_GRANTED',
          actorEmail: accessRequest.requesterEmail,
          actorLabel: accessRequest.requesterName,
          metadata: {
            approvedBy: session.userId,
            status: payload.status ?? updated.status
          }
        }
      });
    }

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'trust_room_request',
      entityId: updated.id,
      action: 'update',
      metadata: {
        status: updated.status,
        assignedOwnerUserId: updated.assignedOwnerUserId,
        grantIssued: Boolean(grantToken)
      }
    });

    return NextResponse.json({
      accessRequest: updated,
      grantUrl:
        grantToken && accessRequest.trustRoom.accessMode === 'REQUEST_ACCESS'
          ? buildTrustRoomShareUrl({
              baseUrl: authBaseUrl,
              slug: accessRequest.trustRoom.slug,
              accessMode: 'REQUEST_ACCESS',
              token: grantToken
            })
          : null,
      grantToken
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
