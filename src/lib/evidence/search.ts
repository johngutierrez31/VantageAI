import { prisma } from '@/lib/db/prisma';
import { cosineSimilarity, createEmbedding } from '@/lib/evidence/embeddings';
import { sanitizeUntrustedEvidence } from '@/lib/ai/safety';

export type EvidenceSearchResult = {
  evidenceId: string;
  evidenceName: string;
  chunkId: string;
  chunkIndex: number;
  snippet: string;
  similarity: number;
  keywordScore: number;
  score: number;
};

function asVector(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function computeKeywordScore(queryTokens: string[], chunkText: string) {
  if (!queryTokens.length) return 0;
  const chunkTokens = new Set(tokenize(chunkText));
  let hits = 0;

  for (const token of queryTokens) {
    if (chunkTokens.has(token)) hits += 1;
  }

  return hits / queryTokens.length;
}

export async function searchEvidenceChunks(tenantId: string, query: string, limit = 8) {
  const queryEmbedding = await createEmbedding(query);
  const queryTokens = tokenize(query);

  const chunks = await prisma.evidenceChunk.findMany({
    where: {
      tenantId,
      evidence: {
        ingestionStatus: 'COMPLETED'
      }
    },
    include: {
      evidence: {
        select: {
          id: true,
          name: true
        }
      }
    },
    take: 1200
  });

  const scored = chunks
    .map((chunk) => {
      const similarity = cosineSimilarity(asVector(chunk.embedding), queryEmbedding);
      const keywordScore = computeKeywordScore(queryTokens, chunk.chunkText);
      const score = Math.max(similarity, keywordScore * 0.35);

      return {
        evidenceId: chunk.evidence.id,
        evidenceName: chunk.evidence.name,
        chunkId: chunk.id,
        chunkIndex: chunk.chunkIndex,
        snippet: sanitizeUntrustedEvidence(chunk.chunkText).slice(0, 380),
        similarity: Number(similarity.toFixed(6)),
        keywordScore: Number(keywordScore.toFixed(6)),
        score: Number(score.toFixed(6))
      } satisfies EvidenceSearchResult;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
