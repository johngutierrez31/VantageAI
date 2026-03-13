'use client';

import Link from 'next/link';
import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Select } from '@/components/ui/select';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    evidenceId: string;
    evidenceName: string;
    chunkId: string;
    chunkIndex: number;
    snippet: string;
    score: number;
  }>;
};

type CopilotMode = 'general' | 'incident_response' | 'threat_modeling' | 'compliance' | 'architecture';

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

const starterPromptsByMode: Record<CopilotMode, string[]> = {
  general: [
    'Show me how Vantage fits alongside our existing stack.',
    'Summarize what to do first for onboarding a new assessment.',
    'Give me a 30/60/90 day governance plan for a small SaaS company.',
    'What evidence should I collect first for access control and incident response?'
  ],
  incident_response: [
    'Help me triage a suspected credential compromise and provide a 24h response checklist.',
    'What containment sequence should we use for a production web app breach?',
    'Draft incident commander updates for leadership and engineering.'
  ],
  threat_modeling: [
    'Threat model a tenant-facing admin API with STRIDE and prioritize controls.',
    'List top attack paths for our assessment and evidence workflows.',
    'What telemetry do we need to detect privilege escalation in this architecture?'
  ],
  compliance: [
    'Map immediate SOC 2 priorities for access control, logging, and incident response.',
    'What evidence set is required to support ISO 27001 audit readiness in 30 days?',
    'Create a prioritized remediation backlog from common control gaps.'
  ],
  architecture: [
    'Review our app architecture and identify highest-risk trust boundary weaknesses.',
    'Design a phased zero-trust hardening plan for identity and segmentation.',
    'What architectural controls should we implement first for SaaS multi-tenant security?'
  ]
};

function renderAssistantContent(content: string) {
  const blocks = content
    .split(/\n{2,}/)
    .map((value) => value.trim())
    .filter(Boolean);

  return blocks.map((block, blockIndex) => {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return null;

    const allBullets = lines.every((line) => /^(\-|\*|\d+\.)\s+/.test(line));
    if (allBullets) {
      return (
        <ul key={`block-list-${blockIndex}`} className="mb-2 list-disc space-y-1 pl-5 text-sm">
          {lines.map((line, lineIndex) => (
            <li key={`line-${lineIndex}`}>
              {line.replace(/^(\-|\*|\d+\.)\s+/, '')}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <Fragment key={`block-text-${blockIndex}`}>
        {lines.map((line, lineIndex) => {
          const isHeading = /:$/.test(line) || /^#{1,3}\s+/.test(line);
          const normalized = line.replace(/^#{1,3}\s+/, '');

          if (isHeading) {
            return (
              <p key={`line-${lineIndex}`} className="mb-1 text-sm font-semibold">
                {normalized.replace(/:$/, '')}
              </p>
            );
          }

          return (
            <p key={`line-${lineIndex}`} className="mb-2 text-sm">
              {normalized}
            </p>
          );
        })}
      </Fragment>
    );
  });
}

export function CopilotPanel({ tenantName }: { tenantName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Copilot is ready for ${tenantName}. Ask for concrete next steps, controls, evidence checklists, or rollout plans.`
    }
  ]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<CopilotMode>('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendedTools, setRecommendedTools] = useState<RecommendedTool[]>([]);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const disableSend = useMemo(() => loading || !input.trim(), [input, loading]);
  const starterPrompts = useMemo(() => starterPromptsByMode[mode], [mode]);

  useEffect(() => {
    if (!messageContainerRef.current) return;
    messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
  }, [messages, loading]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();

    if (!message || loading) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setLoading(true);

    try {
      const history = messages.slice(-8);
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, mode })
      });

      let payload:
        | {
            answer?: string;
            error?: string;
            citations?: Array<{
              evidenceId: string;
              evidenceName: string;
              chunkId: string;
              chunkIndex: number;
              snippet: string;
              score: number;
            }>;
            recommendedTools?: RecommendedTool[];
          }
        | null = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        setError(payload?.error ?? 'Copilot request failed.');
        return;
      }

      const answer = payload?.answer;
      if (!answer) {
        setError('Copilot returned an empty response.');
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: answer,
          citations: payload?.citations ?? []
        }
      ]);
      setRecommendedTools(payload?.recommendedTools ?? []);
    } catch {
      setError('Copilot request failed due to a network or server issue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
      <h3>Copilot</h3>
      <p className="text-sm text-muted-foreground">Tenant: {tenantName} | Workflow launcher and evidence-aware guidance.</p>
      <div className="mb-3 mt-3 grid gap-2 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mode</p>
          <Select value={mode} onChange={(event) => setMode(event.target.value as CopilotMode)}>
            <option value="general">General Advisor</option>
            <option value="incident_response">Incident Response</option>
            <option value="threat_modeling">Threat Modeling</option>
            <option value="compliance">Compliance</option>
            <option value="architecture">Architecture Review</option>
          </Select>
        </div>
        {recommendedTools.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-2">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Recommended Tools</p>
            <div className="space-y-1">
              {recommendedTools.map((tool) => (
                <p key={tool.id} className="text-xs">
                  <Link href={tool.href} className="font-semibold hover:underline">
                    {tool.label}
                  </Link>
                  <span className="text-muted-foreground"> - {tool.reason}</span>
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
            Ask a question to get tool routing suggestions.
          </div>
        )}
      </div>
      <div className="mb-3 mt-3 flex flex-wrap gap-2">
        {starterPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setInput(prompt)}
            disabled={loading}
            className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>
      <div
        ref={messageContainerRef}
        className="mb-3 grid max-h-[420px] gap-2 overflow-y-auto rounded-md border border-border bg-background p-2"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-md border p-3 leading-relaxed ${
              message.role === 'assistant'
                ? 'border-primary/30 bg-primary/10'
                : 'border-border bg-muted/20'
            }`}
          >
            <p className="mb-2 text-sm font-semibold">
              {message.role === 'assistant' ? 'Copilot' : 'You'}
            </p>
            {message.role === 'assistant' ? (
              <div>
                {renderAssistantContent(message.content)}
                {message.citations?.length ? (
                  <div className="mt-3 rounded-md border border-border bg-muted/20 p-2">
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Citations</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {message.citations.map((citation, citationIndex) => (
                        <li key={`${citation.chunkId}-${citationIndex}`}>
                          [{citationIndex + 1}] {citation.evidenceName} (chunk {citation.chunkIndex})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            )}
          </div>
        ))}
        {loading ? (
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3">
            <p className="text-sm font-semibold">Copilot</p>
            <p className="mt-1 text-sm text-muted-foreground">Thinking...</p>
          </div>
        ) : null}
      </div>
      <form onSubmit={sendMessage} className="grid">
        <textarea
          rows={4}
          placeholder="Ask for a guided workflow, next step, evidence checklist, or roadmap plan..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          required
        />
        <button
          type="submit"
          disabled={disableSend}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Thinking...' : 'Ask Copilot'}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
