'use client';

import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react';

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

const starterPrompts = [
  'Summarize what to do first for onboarding a new assessment.',
  'Give me a 30/60/90 day governance plan for a small SaaS company.',
  'What evidence should I collect first for access control and incident response?'
];

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const disableSend = useMemo(() => loading || !input.trim(), [input, loading]);

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
        body: JSON.stringify({ message, history })
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
    } catch {
      setError('Copilot request failed due to a network or server issue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
      <h3>AI Copilot</h3>
      <p className="text-sm text-muted-foreground">Tenant: {tenantName}</p>
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
          placeholder="Ask for practical next steps, evidence checklists, or roadmap plans..."
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
