import { describe, expect, it } from 'vitest';
import { buildEvidenceMapDraft } from '../src/lib/trust/evidence-map';

describe('trustops evidence map generation', () => {
  it('persists buyer-safe clustered output from questionnaire drafts', () => {
    const draft = buildEvidenceMapDraft({
      questionnaireName: 'buyer-questionnaire.csv',
      organizationName: 'Acme Corp',
      items: [
        {
          questionnaireItemId: 'item-1',
          rowKey: 'row-1',
          questionText: 'Do you enforce MFA for administrators?',
          normalizedQuestion: 'do you enforce mfa for administrators',
          ownerIds: ['user-1'],
          openTaskIds: ['task-1'],
          openFindingIds: ['finding-1'],
          draft: {
            status: 'APPROVED',
            answerText: 'Yes. MFA is enforced for privileged administrators.',
            confidenceScore: 0.94,
            mappedControlIds: ['IAM-1'],
            supportingEvidenceIds: ['evidence-mfa', 'evidence-admin-review']
          }
        },
        {
          questionnaireItemId: 'item-2',
          rowKey: 'row-2',
          questionText: 'Is MFA required for privileged admins?',
          normalizedQuestion: 'do you enforce mfa for administrators',
          ownerIds: ['user-2'],
          openTaskIds: [],
          openFindingIds: [],
          draft: {
            status: 'APPROVED',
            answerText: 'Privileged users must enroll in MFA before access is granted.',
            confidenceScore: 0.91,
            mappedControlIds: ['IAM-1'],
            supportingEvidenceIds: ['evidence-mfa']
          }
        }
      ]
    });

    expect(draft.name).toContain('Acme Corp');
    expect(draft.status).toBe('DRAFT');
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]?.questionCluster).toContain('Do you enforce MFA for administrators?');
    expect(draft.items[0]?.relatedControlIds).toEqual(['IAM-1']);
    expect(draft.items[0]?.evidenceArtifactIds).toEqual(['evidence-mfa', 'evidence-admin-review']);
    expect(draft.items[0]?.supportStrength).toBe('STRONG');
    expect(draft.items[0]?.relatedTaskId).toBe('task-1');
    expect(draft.items[0]?.relatedFindingId).toBe('finding-1');
  });

  it('forces review when a cluster has weak or missing support', () => {
    const draft = buildEvidenceMapDraft({
      questionnaireName: 'buyer-questionnaire.csv',
      items: [
        {
          questionnaireItemId: 'item-3',
          rowKey: 'row-3',
          questionText: 'Do you guarantee customer-specific encryption commitments?',
          normalizedQuestion: 'do you guarantee customer specific encryption commitments',
          draft: {
            status: 'NEEDS_REVIEW',
            answerText: 'Internal review required.',
            confidenceScore: 0.58,
            mappedControlIds: ['CRYPTO-1'],
            supportingEvidenceIds: []
          }
        }
      ]
    });

    expect(draft.status).toBe('NEEDS_REVIEW');
    expect(draft.items[0]?.supportStrength).toBe('MISSING');
    expect(draft.items[0]?.recommendedNextAction).toContain('Collect approved evidence');
  });
});
