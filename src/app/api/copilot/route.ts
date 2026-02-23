import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { copilotRequestSchema } from '@/lib/validation/copilot';
import { writeAuditLog } from '@/lib/audit';
import { buildSafetySystemPrompt, redactSecrets } from '@/lib/ai/safety';
import { searchEvidenceChunks } from '@/lib/evidence/search';
import { requireAIAccess, requireCopilotQuota } from '@/lib/billing/entitlements';

type CopilotMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type CopilotCitation = {
  evidenceId: string;
  evidenceName: string;
  chunkId: string;
  chunkIndex: number;
  snippet: string;
  score: number;
};

function estimateTokens(value: string) {
  if (!value) return 0;
  return Math.ceil(value.length / 4);
}

function parseAssistantText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== 'object') return null;
  const message = (firstChoice as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return null;
  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string' && content.trim()) return content.trim();
  return null;
}

async function getTenantSnapshot(tenantId: string) {
  const [templateCount, assessmentCount, inProgressCount, evidenceCount] = await Promise.all([
    prisma.template.count({ where: { tenantId } }),
    prisma.assessment.count({ where: { tenantId } }),
    prisma.assessment.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
    prisma.evidence.count({ where: { tenantId } })
  ]);

  return `Templates: ${templateCount}; Assessments: ${assessmentCount}; In Progress: ${inProgressCount}; Evidence Files: ${evidenceCount}.`;
}

async function generateAnswer(args: {
  tenantName: string;
  snapshot: string;
  history: CopilotMessage[];
  message: string;
  citations: CopilotCitation[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const evidenceContext = args.citations
    .map((citation, index) => `[${index + 1}] ${citation.evidenceName}#${citation.chunkIndex}: ${citation.snippet}`)
    .join('\n\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 950,
      messages: [
        {
          role: 'system',
          content: [
            `You are VantageCISO Copilot for tenant "${args.tenantName}".`,
            buildSafetySystemPrompt(),
            'Use concise action-oriented language suitable for security and compliance teams.',
            'Cite evidence using [1], [2], etc. for claims based on provided snippets.'
          ].join(' ')
        },
        {
          role: 'system',
          content: `Tenant operational snapshot: ${args.snapshot}`
        },
        ...args.history.map((entry) => ({
          role: entry.role,
          content: redactSecrets(entry.content)
        })),
        {
          role: 'user',
          content: [
            `User question: ${redactSecrets(args.message)}`,
            args.citations.length ? `Evidence snippets:\n${evidenceContext}` : 'No relevant evidence snippets found.',
            'Answer with practical guidance and explicit citations where evidence supports statements.'
          ].join('\n\n')
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OPENAI_REQUEST_FAILED:${response.status}`);
  }

  const payload = await response.json();
  const answer = parseAssistantText(payload);
  if (!answer) {
    throw new Error('OPENAI_EMPTY_RESPONSE');
  }

  return {
    answer,
    model
  };
}

function buildFallbackAnswer(message: string, citations: CopilotCitation[]) {
  if (!citations.length) {
    return `No strong tenant evidence was retrieved for "${message}". Add or index relevant evidence and retry.`;
  }

  const snippets = citations
    .slice(0, 3)
    .map((citation, index) => `[${index + 1}] ${citation.snippet}`)
    .join('\n');

  return `Based on current tenant evidence, here are relevant snippets:\n${snippets}\nUse these as the baseline for your next remediation plan.`;
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    await requireAIAccess(session.tenantId);

    const payload = copilotRequestSchema.parse(await request.json());
    const history = payload.history ?? [];
    const citations = (await searchEvidenceChunks(session.tenantId, payload.message, 6)).map((result) => ({
      evidenceId: result.evidenceId,
      evidenceName: result.evidenceName,
      chunkId: result.chunkId,
      chunkIndex: result.chunkIndex,
      snippet: result.snippet,
      score: result.score
    }));

    const estimatedRequestTokens =
      estimateTokens(payload.message) +
      history.reduce((sum, item) => sum + estimateTokens(item.content), 0) +
      citations.reduce((sum, citation) => sum + estimateTokens(citation.snippet), 0);

    await requireCopilotQuota(session.tenantId, estimatedRequestTokens);

    const snapshot = await getTenantSnapshot(session.tenantId);
    let answer = buildFallbackAnswer(payload.message, citations);
    let model = 'heuristic-fallback';

    if (process.env.OPENAI_API_KEY) {
      const generated = await generateAnswer({
        tenantName: session.tenantName,
        snapshot,
        history,
        message: payload.message,
        citations
      });

      if (generated) {
        answer = generated.answer;
        model = generated.model;
      }
    }

    const aiTokens = estimatedRequestTokens + estimateTokens(answer);
    const suggestion = await prisma.aISuggestion.create({
      data: {
        tenantId: session.tenantId,
        type: 'COPILOT_CHAT',
        prompt: payload.message,
        output: {
          answer,
          model,
          citations
        },
        citations: citations.map((citation) => citation.evidenceId),
        createdBy: session.userId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'ai_suggestion',
      entityId: suggestion.id,
      action: 'copilot_chat',
      metadata: {
        model,
        citationCount: citations.length,
        aiTokens
      }
    });

    return NextResponse.json({
      answer,
      model,
      citations
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('OPENAI_REQUEST_FAILED')) {
      return NextResponse.json(
        { error: 'OpenAI request failed. Check OPENAI_API_KEY, OPENAI_MODEL, and account limits.' },
        { status: 502 }
      );
    }
    if (error instanceof Error && error.message === 'OPENAI_EMPTY_RESPONSE') {
      return NextResponse.json({ error: 'OpenAI returned an empty response.' }, { status: 502 });
    }
    return handleRouteError(error);
  }
}
