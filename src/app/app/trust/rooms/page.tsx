import { getPageSessionContext } from '@/lib/auth/page-session';
import { authBaseUrl } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import type { TrustPacketManifest } from '@/lib/trust/package-export';
import { getDefaultTrustRoomSections, summarizeTrustRoomAnalytics } from '@/lib/trust/trust-rooms';
import { TrustRoomPanel } from '@/components/app/trust-room-panel';

function parseManifest(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const manifest = value as TrustPacketManifest;
  return Array.isArray(manifest.sections) ? manifest : null;
}

export default async function TrustRoomsPage({
  searchParams
}: {
  searchParams?: { workflow?: string; packetId?: string };
}) {
  const session = await getPageSessionContext();
  const [packets, rooms, memberships, requests] = await Promise.all([
    prisma.trustPacket.findMany({
      where: { tenantId: session.tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        shareMode: true,
        packageManifestJson: true,
        questionnaireUpload: {
          select: {
            organizationName: true,
            filename: true
          }
        },
        trustRoom: {
          select: {
            id: true,
            slug: true,
            accessMode: true,
            status: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 25
    }),
    prisma.trustRoom.findMany({
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
        questionnaireUpload: {
          select: {
            organizationName: true,
            filename: true
          }
        },
        accessRequests: {
          select: {
            id: true,
            requesterName: true,
            requesterEmail: true,
            status: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        engagementEvents: {
          select: {
            eventType: true,
            sectionKey: true
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        }
      },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.membership.findMany({
      where: {
        tenantId: session.tenantId,
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        user: {
          email: 'asc'
        }
      }
    }),
    prisma.trustRoomAccessRequest.findMany({
      where: { tenantId: session.tenantId },
      include: {
        trustRoom: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 25
    })
  ]);

  return (
    <TrustRoomPanel
      activeWorkflow={
        searchParams?.workflow === 'publish' ||
        searchParams?.workflow === 'access-requests' ||
        searchParams?.workflow === 'engagement'
          ? searchParams.workflow
          : null
      }
      selectedPacketId={searchParams?.packetId ?? null}
      baseUrl={authBaseUrl}
      packets={packets.map((packet) => {
        const manifest = parseManifest(packet.packageManifestJson);
        return {
          id: packet.id,
          name: packet.name,
          status: packet.status,
          shareMode: packet.shareMode,
          organizationName: packet.questionnaireUpload?.organizationName ?? packet.questionnaireUpload?.filename ?? 'Buyer packet',
          existingRoomId: packet.trustRoom?.id ?? null,
          existingRoomSlug: packet.trustRoom?.slug ?? null,
          existingRoomAccessMode: packet.trustRoom?.accessMode ?? null,
          existingRoomStatus: packet.trustRoom?.status ?? null,
          availableSections:
            manifest?.sections.map((section) => ({ id: section.id, title: section.title === 'Cover Summary' ? 'Overview' : section.title })) ?? [],
          suggestedSections: manifest ? getDefaultTrustRoomSections(manifest) : []
        };
      })}
      owners={memberships.map((membership) => ({
        id: membership.user.id,
        label: membership.user.name ?? membership.user.email
      }))}
      rooms={rooms.map((room) => ({
        id: room.id,
        name: room.name,
        slug: room.slug,
        status: room.status,
        accessMode: room.accessMode,
        summaryText: room.summaryText,
        roomSections: room.roomSections,
        termsRequired: room.termsRequired,
        ndaRequired: room.ndaRequired,
        shareExpiresAt: room.shareExpiresAt?.toISOString() ?? null,
        packetName: room.trustPacket.name,
        packetStatus: room.trustPacket.status,
        packetShareMode: room.trustPacket.shareMode,
        organizationName: room.questionnaireUpload?.organizationName ?? room.questionnaireUpload?.filename ?? 'Buyer packet',
        analytics: summarizeTrustRoomAnalytics({
          events: room.engagementEvents,
          requests: room.accessRequests
        })
      }))}
      requests={requests.map((request) => ({
        id: request.id,
        trustRoomId: request.trustRoomId,
        roomName: request.trustRoom.name,
        roomSlug: request.trustRoom.slug,
        requesterName: request.requesterName,
        requesterEmail: request.requesterEmail,
        companyName: request.companyName,
        status: request.status,
        assignedOwnerUserId: request.assignedOwnerUserId,
        internalNotes: request.internalNotes,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        expiresAt: request.expiresAt?.toISOString() ?? null,
        viewCount: request.viewCount,
        lastViewedAt: request.lastViewedAt?.toISOString() ?? null
      }))}
    />
  );
}
