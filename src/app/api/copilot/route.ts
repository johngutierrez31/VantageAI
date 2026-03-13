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
  id:
    | 'command-center'
    | 'adoption'
    | 'security-analyst'
    | 'policies'
    | 'cyber-range'
    | 'assessments'
    | 'evidence'
    | 'trustops'
    | 'trust-rooms'
    | 'buyer-requests'
    | 'buyer-engagement'
    | 'questionnaires'
    | 'review-queue'
    | 'answer-library'
    | 'evidence-maps'
    | 'connectors'
    | 'pulse'
    | 'ai-governance'
    | 'ai-use-cases'
    | 'ai-vendors'
    | 'ai-reviews'
    | 'risk-register'
    | 'roadmap'
    | 'board-brief'
    | 'quarterly-review'
    | 'response-ops'
    | 'incident-triage'
    | 'tabletops';
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
  const [templateCount, assessmentCount, inProgressCount, evidenceCount, aiUseCaseCount, aiPendingReviews] = await Promise.all([
    prisma.template.count({ where: { tenantId } }),
    prisma.assessment.count({ where: { tenantId } }),
    prisma.assessment.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
    prisma.evidence.count({ where: { tenantId } }),
    prisma.aIUseCase.count({ where: { tenantId } }),
    prisma.$transaction([
      prisma.aIUseCase.count({ where: { tenantId, status: { in: ['DRAFT', 'NEEDS_REVIEW'] } } }),
      prisma.aIVendorReview.count({ where: { tenantId, status: { in: ['DRAFT', 'NEEDS_REVIEW'] } } })
    ]).then(([useCaseCount, vendorCount]) => useCaseCount + vendorCount)
  ]);

  return `Templates: ${templateCount}; Assessments: ${assessmentCount}; In Progress: ${inProgressCount}; Evidence Files: ${evidenceCount}; AI Use Cases: ${aiUseCaseCount}; Open AI Reviews: ${aiPendingReviews}.`;
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

  if (/adoption|onboard|migration|existing stack|overlay|operating layer|import|rip and replace|fit with/.test(normalized)) {
    add({
      id: 'adoption',
      label: 'Adoption Mode',
      href: '/app/adoption',
      reason: 'Show how Vantage fits alongside your existing stack through imports, connectors, and guided start paths.'
    });
  }

  if (mode === 'general' || /board|executive|leadership|roadmap|risk register|quarterly|scorecard|posture/.test(normalized)) {
    add({
      id: 'pulse',
      label: 'Pulse',
      href: '/app/pulse',
      reason: 'Open executive scorecards, risk register, roadmap, board brief, and quarterly review workflows.'
    });
    add({
      id: 'risk-register',
      label: 'Risk Register',
      href: '/app/pulse/risks',
      reason: 'Normalize and manage material cyber risks with owners, status, and target dates.'
    });
    add({
      id: 'roadmap',
      label: 'Pulse Roadmap',
      href: '/app/pulse/roadmap',
      reason: 'Translate risks and weak posture categories into a 30/60/90 plan.'
    });
  }

  if (mode === 'general' || mode === 'compliance' || /ai governance|ai use case|ai vendor|llm|model|prompt|rag|agent|vendor intake|retention|training on customer data/.test(normalized)) {
    add({
      id: 'ai-governance',
      label: 'AI Governance',
      href: '/app/ai-governance',
      reason: 'Open the AI governance dashboard for use cases, vendor reviews, policy mapping, and Pulse hooks.'
    });
    add({
      id: 'ai-use-cases',
      label: 'AI Use Cases',
      href: '/app/ai-governance/use-cases',
      reason: 'Register or review AI workflows with data classes, conditions, and decision state.'
    });
    add({
      id: 'ai-vendors',
      label: 'AI Vendor Intake',
      href: '/app/ai-governance/vendors',
      reason: 'Review AI vendor retention, training behavior, logging, and DPA status.'
    });
    add({
      id: 'ai-reviews',
      label: 'AI Review Queue',
      href: '/app/ai-governance/reviews',
      reason: 'Assign reviewers, set due dates, and work overdue AI governance decisions.'
    });
  }

  add({
    id: 'security-analyst',
    label: 'Security Analyst',
    href: '/app/security-analyst',
    reason: 'Run a structured analysis workflow and export a report.'
  });

  if (/connector|integration|slack|jira|confluence|drive|publish to docs|webhook/.test(normalized)) {
    add({
      id: 'connectors',
      label: 'Connector Health',
      href: '/app/settings/connectors',
      reason: 'Configure connectors, test health, and push records into Slack, Jira, Confluence, or outbound hooks.'
    });
  }

  if (mode === 'compliance' || /questionnaire|diligence|trust packet|security review|evidence map|procurement|buyer/.test(normalized)) {
    add({
      id: 'trustops',
      label: 'TrustOps',
      href: '/app/trust',
      reason: 'Manage trust packets, evidence linking, and buyer-facing response workflows.'
    });
    add({
      id: 'trust-rooms',
      label: 'Trust Rooms',
      href: '/app/trust/rooms',
      reason: 'Publish a buyer-facing trust room, control access mode, and keep packet sharing review-safe.'
    });
    add({
      id: 'buyer-requests',
      label: 'Access Requests',
      href: '/app/trust/rooms',
      reason: 'Review buyer requests, assign an owner, and issue access when the room is ready to share.'
    });
    add({
      id: 'buyer-engagement',
      label: 'Buyer Engagement',
      href: '/app/trust/rooms',
      reason: 'See which trust-room sections buyers viewed and whether they downloaded the packet.'
    });
    add({
      id: 'questionnaires',
      label: 'Questionnaires',
      href: '/app/questionnaires',
      reason: 'Draft, review, and approve questionnaire responses with evidence citations.'
    });
    add({
      id: 'review-queue',
      label: 'TrustOps Review Queue',
      href: '/app/trust/reviews',
      reason: 'Assign reviewers, manage due dates, and keep TrustOps work inside SLA.'
    });
    add({
      id: 'answer-library',
      label: 'Answer Library',
      href: '/app/trust/answer-library',
      reason: 'Promote and govern reusable approved answers for faster buyer diligence.'
    });
  }

  if (mode === 'compliance' || /evidence map|support strength|missing evidence|trust packet/.test(normalized)) {
    add({
      id: 'evidence-maps',
      label: 'Evidence Maps',
      href: '/app/questionnaires',
      reason: 'Build or review persisted evidence maps with support strength and next actions.'
    });
  }

  if (/board brief|leadership update|executive brief|board deck/.test(normalized)) {
    add({
      id: 'board-brief',
      label: 'Board Brief',
      href: '/app/pulse',
      reason: 'Draft and review a persisted executive brief with export controls.'
    });
  }

  if (/quarterly review|qbr|quarterly cadence/.test(normalized)) {
    add({
      id: 'quarterly-review',
      label: 'Quarterly Review',
      href: '/app/pulse',
      reason: 'Prepare the recurring leadership review from the latest scorecard, roadmap, and board brief.'
    });
  }

  if (mode === 'compliance' || /soc\s?2|iso|nist|audit|policy|control/.test(normalized)) {
    add({
      id: 'policies',
      label: 'Policies',
      href: '/app/policies',
      reason: 'Generate policy packages aligned to compliance frameworks.'
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
      id: 'response-ops',
      label: 'Response Ops',
      href: '/app/response-ops',
      reason: 'Open incident triage, runbook packs, after-action reporting, and tabletop workflows.'
    });
    add({
      id: 'incident-triage',
      label: 'Incident Triage',
      href: '/app/response-ops',
      reason: 'Start the first-hour incident record, checklist, and decision trail.'
    });
    add({
      id: 'evidence',
      label: 'Evidence Vault',
      href: '/app/evidence',
      reason: 'Capture and index supporting artifacts for investigation.'
    });
  }

  if (/tabletop|exercise|drill|after action|post incident/.test(normalized)) {
    add({
      id: 'tabletops',
      label: 'Tabletop Exercises',
      href: '/app/response-ops',
      reason: 'Prepare or complete a tabletop exercise and convert gaps into tasks, findings, and risks.'
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

  return Array.from(tools.values()).slice(0, 6);
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
      try {
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
      } catch {
        answer = buildFallbackAnswer(payload.message, citations);
        model = 'heuristic-fallback';
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
    return handleRouteError(error);
  }
}
