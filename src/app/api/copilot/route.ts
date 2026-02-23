import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { copilotRequestSchema } from '@/lib/validation/copilot';
import { writeAuditLog } from '@/lib/audit';

type CopilotMessage = {
  role: 'user' | 'assistant';
  content: string;
};

async function getTenantSnapshot(tenantId: string) {
  const [templateCount, assessmentCount, inProgressAssessmentCount, evidenceCount, recentAssessments] = await Promise.all([
    prisma.template.count({ where: { tenantId } }),
    prisma.assessment.count({ where: { tenantId } }),
    prisma.assessment.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
    prisma.evidence.count({ where: { tenantId } }),
    prisma.assessment.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: { name: true, customerName: true, status: true }
    })
  ]);

  const recentSummary = recentAssessments.length
    ? recentAssessments
        .map((assessment) => `${assessment.name} (${assessment.customerName}, ${assessment.status})`)
        .join('; ')
    : 'None';

  return `Templates: ${templateCount}. Assessments: ${assessmentCount}. In progress: ${inProgressAssessmentCount}. Evidence items: ${evidenceCount}. Recent assessments: ${recentSummary}.`;
}

function extractAssistantText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const first = choices[0];
  if (!first || typeof first !== 'object') return null;

  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return null;

  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string' && content.trim()) return content.trim();

  if (Array.isArray(content)) {
    const parts = content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return '';
        const text = (item as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      })
      .filter(Boolean);

    if (parts.length > 0) return parts.join('\n').trim();
  }

  return null;
}

async function generateCopilotAnswer({
  apiKey,
  model,
  tenantName,
  tenantSnapshot,
  history,
  message
}: {
  apiKey: string;
  model: string;
  tenantName: string;
  tenantSnapshot: string;
  history: CopilotMessage[];
  message: string;
}) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content:
            `You are VantageCISO Copilot for tenant "${tenantName}". ` +
            'Give practical, concise guidance for security assessments and governance workflows. ' +
            'If unsure, say what information is missing. Do not claim actions were performed unless the user states they were performed.'
        },
        {
          role: 'system',
          content: `Tenant snapshot: ${tenantSnapshot}`
        },
        ...history.map((entry) => ({
          role: entry.role,
          content: entry.content
        })),
        {
          role: 'user',
          content: message
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OPENAI_REQUEST_FAILED:${response.status}:${detail.slice(0, 300)}`);
  }

  const payload = await response.json();
  const answer = extractAssistantText(payload);

  if (!answer) {
    throw new Error('OPENAI_EMPTY_RESPONSE');
  }

  return answer;
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();

    const payload = copilotRequestSchema.parse(await request.json());
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 });
    }

    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const history = payload.history ?? [];
    const tenantSnapshot = await getTenantSnapshot(session.tenantId);
    const answer = await generateCopilotAnswer({
      apiKey,
      model,
      tenantName: session.tenantName,
      tenantSnapshot,
      history,
      message: payload.message
    });

    const suggestion = await prisma.aISuggestion.create({
      data: {
        tenantId: session.tenantId,
        type: 'COPILOT_CHAT',
        prompt: payload.message,
        output: {
          answer,
          model
        },
        citations: [],
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
        model
      }
    });

    return NextResponse.json({
      answer,
      model
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('OPENAI_REQUEST_FAILED')) {
        return NextResponse.json(
          { error: 'OpenAI request failed. Check OPENAI_API_KEY, OPENAI_MODEL, and account limits.' },
          { status: 502 }
        );
      }

      if (error.message === 'OPENAI_EMPTY_RESPONSE') {
        return NextResponse.json({ error: 'OpenAI returned an empty response.' }, { status: 502 });
      }
    }

    return handleRouteError(error);
  }
}
