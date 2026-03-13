import { prisma } from '@/lib/db/prisma';
import type { TrustPacketManifest } from '@/lib/trust/package-export';
import {
  buildPublishedTrustRoomManifest,
  canViewTrustRoom,
  hashTrustRoomToken
} from '@/lib/trust/trust-rooms';

function parseManifest(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const manifest = value as TrustPacketManifest;
  if (!Array.isArray(manifest.sections)) return null;
  return manifest;
}

export async function getPublicTrustRoom(args: {
  slug: string;
  accessToken?: string | null;
  grantToken?: string | null;
}) {
  const grantTokenHash = args.grantToken ? hashTrustRoomToken(args.grantToken) : null;

  const room = await prisma.trustRoom.findFirst({
    where: {
      slug: args.slug,
      status: 'PUBLISHED'
    },
    include: {
      trustPacket: {
        select: {
          id: true,
          name: true,
          status: true,
          shareMode: true,
          packageManifestJson: true,
          approvedContactName: true,
          approvedContactEmail: true
        }
      }
    }
  });

  if (!room) return null;

  const approvedRequest = grantTokenHash
    ? await prisma.trustRoomAccessRequest.findFirst({
        where: {
          tenantId: room.tenantId,
          trustRoomId: room.id,
          approvedAccessTokenHash: grantTokenHash,
          status: {
            in: ['APPROVED', 'FULFILLED']
          }
        },
        orderBy: { updatedAt: 'desc' }
      })
    : null;

  const manifest = parseManifest(room.trustPacket.packageManifestJson);
  if (!manifest) return null;

  const roomManifest = buildPublishedTrustRoomManifest({
    manifest,
    roomSections: room.roomSections,
    summaryText: room.summaryText
  });

  const canView = canViewTrustRoom({
    accessMode: room.accessMode,
    roomTokenHash: room.shareKeyHash,
    providedAccessToken: args.accessToken,
    approvedGrantTokenHash: approvedRequest?.approvedAccessTokenHash,
    providedGrantToken: args.grantToken,
    shareExpiresAt: room.shareExpiresAt,
    grantExpiresAt: approvedRequest?.expiresAt
  });

  return {
    room,
    roomManifest,
    approvedRequest,
    canView
  };
}
