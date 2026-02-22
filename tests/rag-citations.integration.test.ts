import { describe, expect, it } from 'vitest';
import { createHashedEmbedding } from '../src/lib/evidence/embeddings';
import { rankChunks } from '../src/lib/evidence/retrieval';

describe('rag citation retrieval workflow', () => {
  it('ranks chunks by semantic similarity and returns strongest citation first', () => {
    const queryEmbedding = createHashedEmbedding('multi-factor authentication for admin users');

    const ranked = rankChunks(
      [
        {
          chunkId: 'c1',
          evidenceId: 'e1',
          evidenceName: 'Access Policy',
          chunkText: 'MFA is mandatory for all administrator and privileged accounts.',
          embedding: createHashedEmbedding('MFA is mandatory for all administrator and privileged accounts.')
        },
        {
          chunkId: 'c2',
          evidenceId: 'e2',
          evidenceName: 'Vendor Notice',
          chunkText: 'Vendors complete annual onboarding forms.',
          embedding: createHashedEmbedding('Vendors complete annual onboarding forms.')
        }
      ],
      queryEmbedding,
      2
    );

    expect(ranked).toHaveLength(2);
    expect(ranked[0].evidenceId).toBe('e1');
    expect(ranked[0].similarity).toBeGreaterThan(ranked[1].similarity);
  });
});
