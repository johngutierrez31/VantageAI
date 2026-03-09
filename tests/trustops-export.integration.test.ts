import { describe, expect, it } from 'vitest';
import { buildApprovedQuestionnaireExportRows, buildQuestionnaireCsv } from '../src/lib/questionnaire/export';

describe('trustops questionnaire export', () => {
  it('exports only approved answer metadata columns needed for response packs', () => {
    const exportRows = buildApprovedQuestionnaireExportRows([
      {
        rowKey: 'row-1',
        questionText: 'Do you maintain approved security policies?',
        normalizedQuestion: 'do you maintain approved security policies',
        mappedPrompt: 'Do you maintain approved security policies?',
        draft: {
          answerText: 'Yes. Security policies are approved and reviewed annually.',
          status: 'APPROVED',
          confidenceScore: 0.93,
          mappedControlIds: ['ctrl_policy'],
          supportingEvidenceIds: ['evidence_policy'],
          citations: [{ evidenceName: 'Security Policy.pdf', chunkIndex: 0 }]
        }
      },
      {
        rowKey: 'row-2',
        questionText: 'Do you guarantee customer-specific encryption commitments?',
        normalizedQuestion: 'do you guarantee customer specific encryption commitments',
        mappedPrompt: 'Do you guarantee customer-specific encryption commitments?',
        draft: {
          answerText: 'Review pending',
          status: 'NEEDS_REVIEW',
          confidenceScore: 0.51,
          mappedControlIds: ['ctrl_crypto'],
          supportingEvidenceIds: [],
          citations: []
        }
      }
    ]);
    const csv = buildQuestionnaireCsv(exportRows);

    expect(exportRows).toHaveLength(1);
    expect(csv).toContain('normalized_question');
    expect(csv).toContain('review_status');
    expect(csv).toContain('supporting_evidence_ids');
    expect(csv).toContain('APPROVED');
    expect(csv).toContain('ctrl_policy');
    expect(csv).toContain('Security Policy.pdf#0');
    expect(csv).not.toContain('row-2');
  });
});
