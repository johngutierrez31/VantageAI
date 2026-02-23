'use client';

import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
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
        <ul key={`block-list-${blockIndex}`} style={{ margin: '0 0 10px 18px', padding: 0 }}>
          {lines.map((line, lineIndex) => (
            <li key={`line-${lineIndex}`} style={{ marginBottom: 6 }}>
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
              <p key={`line-${lineIndex}`} style={{ margin: '0 0 6px 0', fontWeight: 700 }}>
                {normalized.replace(/:$/, '')}
              </p>
            );
          }

          return (
            <p key={`line-${lineIndex}`} style={{ margin: '0 0 8px 0' }}>
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

      let payload: { answer?: string; error?: string } | null = null;
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

      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch {
      setError('Copilot request failed due to a network or server issue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>AI Copilot</h3>
      <p>Tenant: {tenantName}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {starterPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => setInput(prompt)} disabled={loading}>
            {prompt}
          </button>
        ))}
      </div>
      <div
        ref={messageContainerRef}
        style={{
          maxHeight: 420,
          overflowY: 'auto',
          display: 'grid',
          gap: 10,
          marginBottom: 12,
          padding: 8,
          border: '1px solid #dbe4ff',
          borderRadius: 10,
          background: '#f8fbff'
        }}
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              background: message.role === 'assistant' ? '#eef2ff' : '#f8fafc',
              borderRadius: 8,
              padding: 12,
              border: message.role === 'assistant' ? '1px solid #dbe4ff' : '1px solid #e2e8f0',
              lineHeight: 1.55
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontWeight: 700 }}>
              {message.role === 'assistant' ? 'Copilot' : 'You'}
            </p>
            {message.role === 'assistant' ? (
              <div>{renderAssistantContent(message.content)}</div>
            ) : (
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
            )}
          </div>
        ))}
        {loading ? (
          <div style={{ padding: 12, borderRadius: 8, border: '1px solid #dbe4ff', background: '#eef2ff' }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Copilot</p>
            <p style={{ margin: '6px 0 0 0' }}>Thinking...</p>
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
        <button type="submit" disabled={disableSend}>
          {loading ? 'Thinking...' : 'Ask Copilot'}
        </button>
      </form>
      {error ? <p>{error}</p> : null}
    </div>
  );
}
