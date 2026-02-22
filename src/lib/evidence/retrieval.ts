import { cosineSimilarity } from './embeddings';

export type RetrievalChunk = {
  chunkId: string;
  evidenceId: string;
  evidenceName: string;
  chunkText: string;
  embedding: unknown;
};

export type RankedChunk = RetrievalChunk & {
  similarity: number;
};

function asVector(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
}

export function rankChunks(chunks: RetrievalChunk[], queryEmbedding: number[], limit = 6) {
  return chunks
    .map((chunk) => ({
      ...chunk,
      similarity: cosineSimilarity(asVector(chunk.embedding), queryEmbedding)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export function buildCitationLabel(index: number, evidenceName: string) {
  return `[${index + 1}] ${evidenceName}`;
}
