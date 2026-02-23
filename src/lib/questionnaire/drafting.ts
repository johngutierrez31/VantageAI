import { buildSafetySystemPrompt, redactSecrets } from '@/lib/ai/safety';
import { searchEvidenceChunks } from '@/lib/evidence/search';

export type DraftCitation = {
  evidenceId: string;
  evidenceName: string;
  chunkId: string;
  chunkIndex: number;
  snippet: string;
  score: number;
};

type DraftResult = {
  answerText: string;
  citations: DraftCitation[];
  model: string;
};

function parseOpenAiAnswer(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (!first || typeof first !== 'object') return null;
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return null;
  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string' && content.trim()) return content.trim();
  return null;
}

async function completeWithOpenAI(input: {
  questionText: string;
  guidance?: string | null;
  context: string;
  model: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0.1,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: [
            'You are assisting with security questionnaires.',
            buildSafetySystemPrompt(),
            'Return concise enterprise-ready answers with clear statements.',
            'Use citation markers [1], [2] when making claims.'
          ].join(' ')
        },
        {
          role: 'user',
          content: [
            `Question: ${redactSecrets(input.questionText)}`,
            input.guidance ? `Mapped guidance: ${redactSecrets(input.guidance)}` : '',
            'Evidence snippets:',
            input.context,
            'Write a draft answer grounded in the evidence only.'
          ]
            .filter(Boolean)
            .join('\n\n')
        }
      ]
    })
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return parseOpenAiAnswer(payload);
}

export async function generateDraftAnswer(input: {
  tenantId: string;
  questionText: string;
  guidance?: string | null;
}) {
  const citations = (await searchEvidenceChunks(input.tenantId, input.questionText, 6)).map((result) => ({
    evidenceId: result.evidenceId,
    evidenceName: result.evidenceName,
    chunkId: result.chunkId,
    chunkIndex: result.chunkIndex,
    snippet: result.snippet,
    score: result.score
  }));

  const context = citations
    .map((citation, index) => `[${index + 1}] ${citation.evidenceName}#${citation.chunkIndex}: ${citation.snippet}`)
    .join('\n\n');

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const aiAnswer = await completeWithOpenAI({
    questionText: input.questionText,
    guidance: input.guidance,
    context,
    model
  });

  if (aiAnswer) {
    return {
      answerText: aiAnswer,
      citations,
      model
    } satisfies DraftResult;
  }

  if (!citations.length) {
    return {
      answerText: 'Insufficient evidence to generate a reliable draft answer.',
      citations: [],
      model: 'heuristic-fallback'
    } satisfies DraftResult;
  }

  const fallbackText = [
    'Draft answer based on available evidence:',
    ...citations.slice(0, 3).map((citation, index) => `[${index + 1}] ${citation.snippet}`)
  ].join('\n');

  return {
    answerText: fallbackText,
    citations,
    model: 'heuristic-fallback'
  } satisfies DraftResult;
}
