import { describe, expect, it } from 'vitest';
import {
  buildTrustPacketManifest,
  renderTrustPacketMarkdown
} from '../src/lib/trust/package-export';

describe('trustops packet export manifest', () => {
  it('builds a buyer-ready external packet manifest without internal-only evidence-map actions', () => {
    const manifest = buildTrustPacketManifest({
      packetName: 'Buyer Packet',
      shareMode: 'EXTERNAL_SHARE',
      status: 'READY_TO_SHARE',
      reviewerRequired: false,
      organizationName: 'Acme Corp',
      approvedContactName: 'Security Lead',
      approvedContactEmail: 'security@acme.example',
      approvedRows: [
        {
          rowKey: 'row-1',
          questionText: 'Do you maintain approved policies?',
          answerText: 'Yes. Policies are reviewed annually.',
          confidenceScore: 0.92,
          mappedControlIds: ['POL-1'],
          supportingEvidenceIds: ['evidence-policy']
        }
      ],
      evidenceMapStatus: 'APPROVED',
      evidenceMapItems: [
        {
          questionCluster: 'Do you maintain approved policies?',
          supportStrength: 'MODERATE',
          buyerSafeSummary: 'Policies are reviewed annually.',
          recommendedNextAction: 'Internal reviewers should validate freshness before buyer publication.',
          relatedControlIds: ['POL-1'],
          evidenceArtifactIds: ['evidence-policy']
        }
      ],
      trustDocs: [
        {
          category: 'Security Policy',
          evidenceName: 'Security Policy.pdf',
          createdAt: '2026-03-01T00:00:00.000Z'
        }
      ],
      staleArtifactIds: ['evidence-old']
    });

    const evidenceMapSection = manifest.sections.find((section) => section.id === 'evidence-map-summary');
    const markdown = renderTrustPacketMarkdown(manifest);

    expect(manifest.approvedContact.email).toBe('security@acme.example');
    expect(evidenceMapSection?.items[0]).toMatchObject({
      questionCluster: 'Do you maintain approved policies?',
      supportStrength: 'MODERATE'
    });
    expect((evidenceMapSection?.items[0] as Record<string, unknown>).recommendedNextAction).toBeUndefined();
    expect(markdown).toContain('Approved Security FAQ');
    expect(markdown).toContain('Security Lead');
    expect(markdown).toContain('evidence-old');
  });
});
