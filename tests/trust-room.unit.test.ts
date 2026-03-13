import { describe, expect, it } from 'vitest';
import { buildTrustPacketManifest } from '@/lib/trust/package-export';
import {
  buildPublishedTrustRoomManifest,
  canViewTrustRoom,
  getDefaultTrustRoomSections,
  hashTrustRoomToken,
  summarizeTrustRoomAnalytics
} from '@/lib/trust/trust-rooms';

describe('trust room helpers', () => {
  it('filters a packet manifest down to approved room sections and carries the buyer-safe summary into overview', () => {
    const manifest = buildTrustPacketManifest({
      packetName: 'Northbridge Payments trust packet - external share',
      shareMode: 'EXTERNAL_SHARE',
      status: 'READY_TO_SHARE',
      reviewerRequired: false,
      organizationName: 'Northbridge Payments',
      approvedContactName: 'Morgan Trust',
      approvedContactEmail: 'trust.reviewer@vantageciso.local',
      approvedRows: [
        {
          rowKey: 'A12',
          questionText: 'Do you maintain approved security policies?',
          answerText: 'Yes. Approved policies are maintained centrally.',
          confidenceScore: 0.97,
          supportingEvidenceIds: ['evidence-policy'],
          mappedControlIds: ['SEC-GOV-1']
        }
      ],
      evidenceMapStatus: 'APPROVED',
      evidenceMapItems: [
        {
          questionCluster: 'Approved security policy management',
          supportStrength: 'STRONG',
          buyerSafeSummary: 'Policy ownership and review cadence are documented.',
          recommendedNextAction: 'Refresh the policy summary annually.',
          relatedControlIds: ['SEC-GOV-1'],
          evidenceArtifactIds: ['evidence-policy']
        }
      ],
      trustDocs: [
        {
          category: 'Security Policy',
          evidenceName: 'Security Policy Compendium 2026',
          createdAt: '2026-03-01T00:00:00.000Z'
        }
      ],
      staleArtifactIds: [],
      includeAiGovernanceSummary: true
    });

    const published = buildPublishedTrustRoomManifest({
      manifest,
      roomSections: ['cover-summary', 'approved-security-faq', 'approved-contact-details'],
      summaryText: 'Buyer-safe room summary'
    });

    expect(getDefaultTrustRoomSections(manifest)).toContain('ai-governance-summary');
    expect(published.sections.map((section) => section.id)).toEqual([
      'cover-summary',
      'approved-security-faq',
      'approved-contact-details'
    ]);
    expect(published.sections[0]?.title).toBe('Overview');
    expect(published.sections[0]?.items[0]).toMatchObject({
      roomSummary: 'Buyer-safe room summary'
    });
  });

  it('summarizes practical engagement counts and section interest', () => {
    const summary = summarizeTrustRoomAnalytics({
      events: [
        { eventType: 'ROOM_VIEWED' },
        { eventType: 'ROOM_VIEWED' },
        { eventType: 'SECTION_VIEWED', sectionKey: 'approved-security-faq' },
        { eventType: 'SECTION_VIEWED', sectionKey: 'approved-security-faq' },
        { eventType: 'SECTION_VIEWED', sectionKey: 'evidence-map-summary' },
        { eventType: 'PACKET_DOWNLOADED' },
        { eventType: 'REQUEST_SUBMITTED' },
        { eventType: 'ACCESS_GRANTED' }
      ],
      requests: [
        { status: 'PENDING' },
        { status: 'FULFILLED' }
      ]
    });

    expect(summary.counts).toMatchObject({
      roomViews: 2,
      downloads: 1,
      requestsSubmitted: 1,
      accessGranted: 1
    });
    expect(summary.requestCounts).toMatchObject({
      pending: 1,
      fulfilled: 1
    });
    expect(summary.topSections[0]).toMatchObject({
      sectionKey: 'approved-security-faq',
      views: 2
    });
  });

  it('enforces the expected public access rules for protected links and approved grants', () => {
    expect(
      canViewTrustRoom({
        accessMode: 'PROTECTED_LINK',
        roomTokenHash: hashTrustRoomToken('share-token'),
        providedAccessToken: 'share-token'
      })
    ).toBe(true);

    expect(
      canViewTrustRoom({
        accessMode: 'REQUEST_ACCESS',
        approvedGrantTokenHash: hashTrustRoomToken('grant-token'),
        providedGrantToken: 'grant-token',
        grantExpiresAt: new Date(Date.now() + 60_000)
      })
    ).toBe(true);

    expect(
      canViewTrustRoom({
        accessMode: 'REQUEST_ACCESS',
        approvedGrantTokenHash: hashTrustRoomToken('grant-token'),
        providedGrantToken: 'grant-token',
        grantExpiresAt: new Date(Date.now() - 60_000)
      })
    ).toBe(false);
  });
});
