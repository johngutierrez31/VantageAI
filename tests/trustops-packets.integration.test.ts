import { describe, expect, it } from 'vitest';
import { buildTrustPacketRecord, deriveQuestionnaireUploadStatus } from '../src/lib/trust/packets';

describe('trustops packet workflow helpers', () => {
  it('keeps questionnaire uploads in drafted state until every row is approved', () => {
    expect(deriveQuestionnaireUploadStatus([{ status: 'APPROVED' }], 3)).toBe('DRAFTED');
    expect(
      deriveQuestionnaireUploadStatus(
        [
          { status: 'APPROVED' },
          { status: 'APPROVED' }
        ],
        2
      )
    ).toBe('APPROVED');
    expect(
      deriveQuestionnaireUploadStatus(
        [
          { status: 'APPROVED' },
          { status: 'NEEDS_REVIEW' }
        ],
        2
      )
    ).toBe('NEEDS_REVIEW');
  });

  it('builds a trust packet record and flags stale artifacts for review', () => {
    const packet = buildTrustPacketRecord({
      packetName: 'Q2 Buyer Packet',
      shareMode: 'EXTERNAL_SHARE',
      organizationName: 'Acme Manufacturing',
      approvedRows: [
        {
          rowKey: 'row-1',
          questionText: 'Do you maintain approved security policies?',
          answerText: 'Yes. Security policies are approved and reviewed annually.',
          confidenceScore: 0.92,
          supportingEvidenceIds: ['evidence_policy'],
          mappedControlIds: ['ctrl_policy']
        }
      ],
      trustDocs: [
        {
          id: 'doc_policy',
          category: 'Security Policy',
          evidenceId: 'evidence_policy',
          createdAt: new Date('2025-12-01T00:00:00.000Z'),
          evidence: {
            id: 'evidence_policy',
            name: 'Security Policy.pdf',
            createdAt: new Date('2025-12-01T00:00:00.000Z')
          }
        },
        {
          id: 'doc_old',
          category: 'Penetration Test',
          evidenceId: 'evidence_old',
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
          evidence: {
            id: 'evidence_old',
            name: 'Old Pen Test.pdf',
            createdAt: new Date('2025-01-01T00:00:00.000Z')
          }
        }
      ]
    });

    expect(packet.packetSections.map((section) => section.id)).toContain('approved-questionnaire-responses');
    expect(packet.includedArtifactIds).toContain('evidence_policy');
    expect(packet.includedArtifactIds).not.toContain('evidence_old');
    expect(packet.excludedArtifactIds).toContain('evidence_old');
    expect(packet.staleArtifactIds).toContain('evidence_old');
    expect(packet.status).toBe('READY_FOR_REVIEW');
    expect(packet.reviewerRequired).toBe(true);
  });
});
