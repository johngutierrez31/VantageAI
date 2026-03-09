import { beforeEach, describe, expect, it, vi } from 'vitest';

const { searchEvidenceChunks, evidenceFindMany } = vi.hoisted(() => ({
  searchEvidenceChunks: vi.fn(),
  evidenceFindMany: vi.fn()
}));

vi.mock('@/lib/evidence/search', () => ({
  searchEvidenceChunks
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    evidence: {
      findMany: evidenceFindMany
    }
  }
}));

import { generateDraftAnswer } from '../src/lib/questionnaire/drafting';

describe('trustops draft generation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.OPENAI_API_KEY = '';
  });

  it('produces high-confidence drafts when approved answers and strong evidence align', async () => {
    searchEvidenceChunks.mockResolvedValue([
      {
        evidenceId: 'evidence_policy',
        evidenceName: 'Security Policy.pdf',
        chunkId: 'chunk_1',
        chunkIndex: 0,
        snippet: 'Security policies are approved annually by executive leadership.',
        score: 0.62
      },
      {
        evidenceId: 'evidence_review',
        evidenceName: 'Policy Review Minutes.pdf',
        chunkId: 'chunk_2',
        chunkIndex: 1,
        snippet: 'The review committee approved policy updates in Q1.',
        score: 0.44
      }
    ]);
    evidenceFindMany.mockResolvedValue([]);

    const draft = await generateDraftAnswer({
      tenantId: 'tenant_demo',
      questionText: 'Do you maintain approved security policies?',
      guidance: 'Focus on approval cadence and governance ownership.',
      mappedControlIds: ['ctrl_policy'],
      approvedAnswers: [
        {
          id: 'ans_policy',
          normalizedQuestion: 'do you maintain approved security policies',
          questionText: 'Do you maintain approved security policies?',
          answerText: 'Yes. Security policies are approved and reviewed annually.',
          mappedControlIds: ['ctrl_policy'],
          supportingEvidenceIds: ['evidence_policy'],
          scope: 'REUSABLE'
        }
      ]
    });

    expect(draft.approvedAnswerId).toBe('ans_policy');
    expect(draft.confidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(draft.reviewRequired).toBe(false);
    expect(draft.mappedControlIds).toContain('ctrl_policy');
    expect(draft.supportingEvidenceIds).toContain('evidence_policy');
  });

  it('forces review when evidence is missing or the question is sensitive', async () => {
    searchEvidenceChunks.mockResolvedValue([]);
    evidenceFindMany.mockResolvedValue([]);

    const draft = await generateDraftAnswer({
      tenantId: 'tenant_demo',
      questionText: 'Do you guarantee SOC 2 compliance for all customer environments?',
      approvedAnswers: []
    });

    expect(draft.reviewRequired).toBe(true);
    expect(draft.supportStrength).toBe('MISSING');
    expect(draft.reviewReason).toContain('Missing approved supporting evidence');
    expect(draft.reviewReason).toContain('sensitive');
    expect(draft.answerText.toLowerCase()).toContain('insufficient');
  });
});
