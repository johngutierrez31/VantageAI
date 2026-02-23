import { prisma } from '@/lib/db/prisma';
import { createEmbedding } from '@/lib/evidence/embeddings';
import { buildCitationLabel, rankChunks } from '@/lib/evidence/retrieval';
import { buildSafetySystemPrompt, redactSecrets, sanitizeUntrustedEvidence } from '@/lib/ai/safety';

export type RagCitation = {
  evidenceId: string;
  evidenceName: string;
  chunkId: string;
  label: string;
  snippet: string;
  similarity: number;
};

type RagResult = {
  answer: string;
  citations: RagCitation[];
  prompt: string;
};

async function generateOpenAIAnswer(questionPrompt: string, context: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a compliance analyst assistant. ' +
            buildSafetySystemPrompt() +
            ' Use only the provided evidence snippets. If evidence is insufficient, say "insufficient evidence".'
        },
        {
          role: 'user',
          content: `Question: ${redactSecrets(questionPrompt)}\n\nEvidence:\n${context}\n\nReturn a concise answer and include citation references like [1], [2].`
        }
      ]
    })
  });

  if (!response.ok) return null;

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) return null;

  return content.trim();
}

export async function runRagForQuestion(tenantId: string, questionPrompt: string): Promise<RagResult> {
  const queryEmbedding = await createEmbedding(questionPrompt);

  const chunks = await prisma.evidenceChunk.findMany({
    where: {
      tenantId,
      evidence: {
        ingestionStatus: 'COMPLETED'
      }
    },
    include: {
      evidence: {
        select: { id: true, name: true }
      }
    },
    take: 200
  });

  const ranked = rankChunks(
    chunks.map((chunk) => ({
      chunkId: chunk.id,
      evidenceId: chunk.evidence.id,
      evidenceName: chunk.evidence.name,
      chunkText: chunk.chunkText,
      embedding: chunk.embedding
    })),
    queryEmbedding,
    6
  );

  if (!ranked.length || ranked[0].similarity < 0.05) {
    return {
      answer: 'insufficient evidence',
      citations: [],
      prompt: questionPrompt
    };
  }

  const citations: RagCitation[] = ranked.map((chunk, index) => ({
    evidenceId: chunk.evidenceId,
    evidenceName: chunk.evidenceName,
    chunkId: chunk.chunkId,
    label: buildCitationLabel(index, chunk.evidenceName),
    snippet: sanitizeUntrustedEvidence(chunk.chunkText).slice(0, 280),
    similarity: Number(chunk.similarity.toFixed(4))
  }));

  const context = citations
    .map((citation, index) => `[${index + 1}] (${citation.evidenceId}) ${citation.snippet}`)
    .join('\n\n');

  const aiAnswer = await generateOpenAIAnswer(questionPrompt, context);

  if (aiAnswer) {
    return {
      answer: aiAnswer,
      citations,
      prompt: questionPrompt
    };
  }

  const fallbackAnswer = `${citations
    .slice(0, 3)
    .map((citation, index) => `${index + 1}. ${citation.snippet}`)
    .join(' ')} (Sources: ${citations
    .slice(0, 3)
    .map((citation, index) => `[${index + 1}]`)
    .join(', ')})`;

  return {
    answer: fallbackAnswer,
    citations,
    prompt: questionPrompt
  };
}
