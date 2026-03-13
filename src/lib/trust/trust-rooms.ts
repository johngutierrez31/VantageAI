import { createHash, randomBytes } from 'crypto';
import type { TrustPacketManifest } from '@/lib/trust/package-export';

export const TRUST_ROOM_SECTION_OPTIONS = [
  { id: 'cover-summary', label: 'Overview' },
  { id: 'approved-security-faq', label: 'Approved FAQ' },
  { id: 'evidence-map-summary', label: 'Evidence Map Summary' },
  { id: 'policy-summaries', label: 'Trust Packet Sections' },
  { id: 'executive-posture-summary', label: 'Posture Summary' },
  { id: 'ai-governance-summary', label: 'AI Governance Summary' },
  { id: 'approved-contact-details', label: 'Approved Security Contact' }
] as const;

export const DEFAULT_TRUST_ROOM_SECTION_IDS = [
  'cover-summary',
  'approved-security-faq',
  'evidence-map-summary',
  'policy-summaries',
  'executive-posture-summary',
  'approved-contact-details'
] as const;

type EngagementEventInput = {
  eventType: 'ROOM_VIEWED' | 'SECTION_VIEWED' | 'PACKET_DOWNLOADED' | 'REQUEST_SUBMITTED' | 'ACCESS_GRANTED';
  sectionKey?: string | null;
};

type AccessRequestInput = {
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'FULFILLED';
};

export function slugifyTrustRoomName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 120);
}

export function hashTrustRoomToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function generateTrustRoomToken() {
  return randomBytes(12).toString('hex');
}

export function roomTokenMatches(hash: string | null | undefined, value: string | null | undefined) {
  if (!hash || !value) return false;
  return hashTrustRoomToken(value) === hash;
}

export function getDefaultTrustRoomSections(manifest: TrustPacketManifest) {
  const available = new Set(manifest.sections.map((section) => section.id));
  const defaults = DEFAULT_TRUST_ROOM_SECTION_IDS.filter((id) => available.has(id)) as string[];
  if (available.has('ai-governance-summary')) {
    defaults.push('ai-governance-summary');
  }
  return defaults;
}

export function buildPublishedTrustRoomManifest(args: {
  manifest: TrustPacketManifest;
  roomSections: string[];
  summaryText?: string | null;
}) {
  const allowed = new Set(args.roomSections);
  return {
    ...args.manifest,
    sections: args.manifest.sections
      .filter((section) => allowed.has(section.id))
      .map((section) => {
        if (section.id !== 'cover-summary') return section;
        return {
          ...section,
          title: 'Overview',
          items: section.items.map((item) => ({
            ...item,
            roomSummary: args.summaryText?.trim() || undefined
          }))
        };
      })
  } satisfies TrustPacketManifest;
}

export function summarizeTrustRoomAnalytics(args: {
  events: EngagementEventInput[];
  requests: AccessRequestInput[];
}) {
  const counts = {
    roomViews: 0,
    downloads: 0,
    requestsSubmitted: 0,
    accessGranted: 0
  };
  const sectionViews = new Map<string, number>();
  const requestCounts = {
    pending: 0,
    approved: 0,
    denied: 0,
    fulfilled: 0
  };

  for (const event of args.events) {
    if (event.eventType === 'ROOM_VIEWED') counts.roomViews += 1;
    if (event.eventType === 'PACKET_DOWNLOADED') counts.downloads += 1;
    if (event.eventType === 'REQUEST_SUBMITTED') counts.requestsSubmitted += 1;
    if (event.eventType === 'ACCESS_GRANTED') counts.accessGranted += 1;
    if (event.eventType === 'SECTION_VIEWED' && event.sectionKey) {
      sectionViews.set(event.sectionKey, (sectionViews.get(event.sectionKey) ?? 0) + 1);
    }
  }

  for (const request of args.requests) {
    if (request.status === 'PENDING') requestCounts.pending += 1;
    if (request.status === 'APPROVED') requestCounts.approved += 1;
    if (request.status === 'DENIED') requestCounts.denied += 1;
    if (request.status === 'FULFILLED') requestCounts.fulfilled += 1;
  }

  const topSections = Array.from(sectionViews.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([sectionKey, views]) => ({ sectionKey, views }));

  return {
    counts,
    requestCounts,
    topSections
  };
}

export function buildTrustRoomShareUrl(args: {
  baseUrl: string;
  slug: string;
  accessMode: 'INTERNAL_REVIEW' | 'PROTECTED_LINK' | 'REQUEST_ACCESS';
  token?: string | null;
}) {
  const url = new URL(`/trust-room/${args.slug}`, args.baseUrl);
  if (args.accessMode === 'PROTECTED_LINK' && args.token) {
    url.searchParams.set('access', args.token);
  }
  if (args.accessMode === 'REQUEST_ACCESS' && args.token) {
    url.searchParams.set('grant', args.token);
  }
  return url.toString();
}

export function canViewTrustRoom(args: {
  accessMode: 'INTERNAL_REVIEW' | 'PROTECTED_LINK' | 'REQUEST_ACCESS';
  roomTokenHash?: string | null;
  providedAccessToken?: string | null;
  approvedGrantTokenHash?: string | null;
  providedGrantToken?: string | null;
  shareExpiresAt?: Date | null;
  grantExpiresAt?: Date | null;
}) {
  if (args.shareExpiresAt && args.shareExpiresAt.getTime() < Date.now()) {
    return false;
  }

  if (args.accessMode === 'INTERNAL_REVIEW') return false;
  if (args.accessMode === 'PROTECTED_LINK') {
    return roomTokenMatches(args.roomTokenHash, args.providedAccessToken);
  }
  if (args.grantExpiresAt && args.grantExpiresAt.getTime() < Date.now()) {
    return false;
  }
  return roomTokenMatches(args.approvedGrantTokenHash, args.providedGrantToken);
}
