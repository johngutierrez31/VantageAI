import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { copilotRequestSchema, type CopilotMode } from '@/lib/validation/copilot';
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

type RecommendedTool = {
  id: 'command-center' | 'security-analyst' | 'policies' | 'cyber-range' | 'assessments' | 'evidence';
  label: string;
  href: string;
  reason: string;
};

const copilotModePrompts: Record<CopilotMode, string> = {
  general: 'Default assistant mode for mixed governance and execution tasks.',
  incident_response:
    'Incident response mode: prioritize containment, triage sequencing, and explicitly time-boxed 24h/7d/30d actions.',
  threat_modeling:
    'Threat modeling mode: structure output by assets, attack paths, controls, and residual risk with STRIDE/MITRE context.',
  compliance:
    'Compliance mode: map recommendations to control language, evidence requirements, and audit-readiness actions.',
  architecture:
    'Security architecture mode: evaluate trust boundaries, identity, segmentation, and defense-in-depth improvements.'
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
  mode: CopilotMode;
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
            copilotModePrompts[args.mode],
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

function buildToolRecommendations(message: string, mode: CopilotMode): RecommendedTool[] {
  const tools = new Map<RecommendedTool['id'], RecommendedTool>();
  const normalized = message.toLowerCase();

  const add = (tool: RecommendedTool) => {
    if (!tools.has(tool.id)) tools.set(tool.id, tool);
  };

  add({
    id: 'command-center',
    label: 'Command Center',
    href: '/app/command-center',
    reason: 'Review daily mission queue and trend-informed priorities.'
  });

  add({
    id: 'security-analyst',
    label: 'Security Analyst',
    href: '/app/security-analyst',
    reason: 'Run a structured analysis workflow and export a report.'
  });

  if (mode === 'compliance' || /soc\s?2|iso|nist|audit|policy|control/.test(normalized)) {
    add({
      id: 'policies',
      label: 'Policy Generator',
      href: '/app/policies',
      reason: 'Generate policy docs aligned to compliance frameworks.'
    });
    add({
      id: 'assessments',
      label: 'Assessments',
      href: '/app/assessments',
      reason: 'Track control scores, gaps, and reassessment trend.'
    });
  }

  if (mode === 'incident_response' || /incident|breach|contain|forensic|alert/.test(normalized)) {
    add({
      id: 'evidence',
      label: 'Evidence Vault',
      href: '/app/evidence',
      reason: 'Capture and index supporting artifacts for investigation.'
    });
  }

  if (mode === 'threat_modeling' || mode === 'architecture' || /attack surface|architecture|segmentation|range/.test(normalized)) {
    add({
      id: 'cyber-range',
      label: 'Cyber Range',
      href: '/app/cyber-range',
      reason: 'Design and test scenarios before production rollout.'
    });
  }

  return Array.from(tools.values()).slice(0, 4);
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    await requireAIAccess(session.tenantId);

    const payload = copilotRequestSchema.parse(await request.json());
    const mode = payload.mode ?? 'general';
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
        citations,
        mode
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
        aiTokens,
        mode
      }
    });

    const recommendedTools = buildToolRecommendations(payload.message, mode);

    return NextResponse.json({
      answer,
      model,
      citations,
      recommendedTools
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
