import { NextResponse } from 'next/server';
import type { TrustPacketManifest } from '@/lib/trust/package-export';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { authBaseUrl } from '@/lib/auth/options';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError, badRequest } from '@/lib/http';
import { trustRoomCreateSchema } from '@/lib/validation/trust';
import {
  buildTrustRoomShareUrl,
  generateTrustRoomToken,
  getDefaultTrustRoomSections,
  hashTrustRoomToken
} from '@/lib/trust/trust-rooms';

function parseManifest(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const manifest = value as TrustPacketManifest;
  if (!Array.isArray(manifest.sections)) return null;
  return manifest;
}

export async function GET() {
  try {
    const session = await getSessionContext();
    const rooms = await prisma.trustRoom.findMany({
      where: { tenantId: session.tenantId },
      include: {
        trustPacket: {
          select: {
            id: true,
            name: true,
            status: true,
            shareMode: true
          }
        },
        _count: {
          select: {
            accessRequests: true,
            engagementEvents: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(rooms);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = trustRoomCreateSchema.parse(await request.json());

    const packet = await prisma.trustPacket.findFirst({
      where: {
        id: payload.trustPacketId,
        tenantId: session.tenantId
      },
      include: {
        trustRoom: true,
        questionnaireUpload: {
          select: {
            id: true,
            organizationName: true
          }
        },
        trustInboxItem: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!packet) return badRequest('Trust packet not found for this tenant');

    if (payload.accessMode !== 'INTERNAL_REVIEW') {
      if (packet.shareMode !== 'EXTERNAL_SHARE') {
        return badRequest('Buyer-facing trust rooms require an external-share trust packet');
      }
      if (!['READY_TO_SHARE', 'SHARED'].includes(packet.status)) {
        return badRequest('Buyer-facing trust rooms require a trust packet that is ready to share');
      }
    }

    const manifest = parseManifest(packet.packageManifestJson);
    if (!manifest) {
      return badRequest('Trust packet manifest is missing or invalid; reassemble the packet before publishing');
    }

    const allowedSectionIds = new Set(manifest.sections.map((section) => section.id));
    const invalidSections = payload.roomSections.filter((sectionId) => !allowedSectionIds.has(sectionId));
    if (invalidSections.length) {
      return badRequest(`Selected room sections are not available on this trust packet: ${invalidSections.join(', ')}`);
    }

    if (!payload.roomSections.length) {
      payload.roomSections = getDefaultTrustRoomSections(manifest);
    }

    const slugCollision = await prisma.trustRoom.findFirst({
      where: {
        tenantId: session.tenantId,
        slug: payload.slug,
        NOT: {
          trustPacketId: packet.id
        }
      },
      select: { id: true }
    });
    if (slugCollision) {
      return badRequest('That trust room slug is already in use for this tenant');
    }

    const shareToken = payload.accessMode === 'PROTECTED_LINK' ? generateTrustRoomToken() : null;
    const shareKeyHash = shareToken ? hashTrustRoomToken(shareToken) : null;
    const now = new Date();

    const room = packet.trustRoom
      ? await prisma.trustRoom.update({
          where: { id: packet.trustRoom.id },
          data: {
            name: payload.name,
            slug: payload.slug,
            status: 'PUBLISHED',
            accessMode: payload.accessMode,
            roomSections: payload.roomSections,
            summaryText: payload.summaryText ?? null,
            termsRequired: payload.termsRequired,
            ndaRequired: payload.ndaRequired,
            shareKeyHash,
            shareExpiresAt:
              payload.shareExpiresAt === undefined
                ? packet.trustRoom.shareExpiresAt
                : payload.shareExpiresAt === null
                  ? null
                  : new Date(payload.shareExpiresAt),
            publishedAt: now,
            publishedBy: session.userId
          }
        })
      : await prisma.trustRoom.create({
          data: {
            tenantId: session.tenantId,
            trustPacketId: packet.id,
            trustInboxItemId: packet.trustInboxItemId,
            questionnaireUploadId: packet.questionnaireUploadId,
            name: payload.name,
            slug: payload.slug,
            status: 'PUBLISHED',
            accessMode: payload.accessMode,
            roomSections: payload.roomSections,
            summaryText: payload.summaryText ?? null,
            termsRequired: payload.termsRequired,
            ndaRequired: payload.ndaRequired,
            shareKeyHash,
            shareExpiresAt: payload.shareExpiresAt ? new Date(payload.shareExpiresAt) : null,
            publishedAt: now,
            publishedBy: session.userId,
            createdBy: session.userId
          }
        });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'trust_room',
      entityId: room.id,
      action: packet.trustRoom ? 'update' : 'publish',
      metadata: {
        trustPacketId: packet.id,
        trustInboxItemId: packet.trustInboxItem?.id ?? null,
        questionnaireUploadId: packet.questionnaireUpload?.id ?? null,
        accessMode: room.accessMode,
        sectionCount: room.roomSections.length
      }
    });

    return NextResponse.json({
      room,
      shareUrl: buildTrustRoomShareUrl({
        baseUrl: authBaseUrl,
        slug: room.slug,
        accessMode: room.accessMode,
        token: shareToken
      }),
      shareToken
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
