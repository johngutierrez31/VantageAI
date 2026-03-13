import { NextResponse } from 'next/server';
import type { TrustPacketManifest } from '@/lib/trust/package-export';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { authBaseUrl } from '@/lib/auth/options';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { trustRoomUpdateSchema } from '@/lib/validation/trust';
import {
  buildTrustRoomShareUrl,
  generateTrustRoomToken,
  hashTrustRoomToken
} from '@/lib/trust/trust-rooms';

function parseManifest(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const manifest = value as TrustPacketManifest;
  if (!Array.isArray(manifest.sections)) return null;
  return manifest;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = trustRoomUpdateSchema.parse(await request.json());

    const room = await prisma.trustRoom.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      },
      include: {
        trustPacket: {
          select: {
            id: true,
            status: true,
            shareMode: true,
            packageManifestJson: true
          }
        }
      }
    });

    if (!room) return notFound('Trust room not found');

    const nextAccessMode = payload.accessMode ?? room.accessMode;
    const nextStatus = payload.status ?? room.status;

    if (nextAccessMode !== 'INTERNAL_REVIEW') {
      if (room.trustPacket.shareMode !== 'EXTERNAL_SHARE') {
        return badRequest('Buyer-facing trust rooms require an external-share trust packet');
      }
      if (!['READY_TO_SHARE', 'SHARED'].includes(room.trustPacket.status)) {
        return badRequest('Buyer-facing trust rooms require a trust packet that is ready to share');
      }
    }

    const manifest = parseManifest(room.trustPacket.packageManifestJson);
    if (!manifest) {
      return badRequest('Trust packet manifest is missing or invalid');
    }

    if (payload.roomSections) {
      const allowedSectionIds = new Set(manifest.sections.map((section) => section.id));
      const invalidSections = payload.roomSections.filter((sectionId) => !allowedSectionIds.has(sectionId));
      if (invalidSections.length) {
        return badRequest(`Selected room sections are not available on this trust packet: ${invalidSections.join(', ')}`);
      }
    }

    if (payload.slug && payload.slug !== room.slug) {
      const slugCollision = await prisma.trustRoom.findFirst({
        where: {
          tenantId: session.tenantId,
          slug: payload.slug,
          NOT: {
            id: room.id
          }
        },
        select: { id: true }
      });
      if (slugCollision) {
        return badRequest('That trust room slug is already in use for this tenant');
      }
    }

    const shareToken =
      nextAccessMode === 'PROTECTED_LINK' && (payload.rotateShareKey || room.accessMode !== 'PROTECTED_LINK')
        ? generateTrustRoomToken()
        : null;

    const updated = await prisma.trustRoom.update({
      where: { id: room.id },
      data: {
        name: payload.name,
        slug: payload.slug,
        status: payload.status,
        accessMode: payload.accessMode,
        roomSections: payload.roomSections,
        summaryText: payload.summaryText === undefined ? undefined : payload.summaryText,
        termsRequired: payload.termsRequired,
        ndaRequired: payload.ndaRequired,
        shareKeyHash:
          nextAccessMode === 'PROTECTED_LINK'
            ? shareToken
              ? hashTrustRoomToken(shareToken)
              : room.shareKeyHash
            : null,
        shareExpiresAt:
          payload.shareExpiresAt === undefined
            ? undefined
            : payload.shareExpiresAt === null
              ? null
              : new Date(payload.shareExpiresAt),
        publishedAt: nextStatus === 'PUBLISHED' && room.publishedAt === null ? new Date() : undefined,
        publishedBy: nextStatus === 'PUBLISHED' ? session.userId : room.publishedBy
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'trust_room',
      entityId: updated.id,
      action: 'update',
      metadata: {
        accessMode: updated.accessMode,
        status: updated.status,
        rotateShareKey: Boolean(shareToken),
        sectionCount: updated.roomSections.length
      }
    });

    return NextResponse.json({
      room: updated,
      shareUrl:
        updated.status === 'PUBLISHED'
          ? buildTrustRoomShareUrl({
              baseUrl: authBaseUrl,
              slug: updated.slug,
              accessMode: updated.accessMode,
              token: shareToken
            })
          : null,
      shareToken
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
