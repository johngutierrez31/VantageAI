'use client';

import { FormEvent, useState } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const starterPrompts = [
  'Summarize what to do first for onboarding a new assessment.',
  'Give me a 30/60/90 day governance plan for a small SaaS company.',
  'What evidence should I collect first for access control and incident response?'
];

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
      <div style={{ maxHeight: 360, overflowY: 'auto', display: 'grid', gap: 10, marginBottom: 12 }}>
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              background: message.role === 'assistant' ? '#eef2ff' : '#f8fafc',
              borderRadius: 8,
              padding: 10,
              whiteSpace: 'pre-wrap'
            }}
          >
            <strong>{message.role === 'assistant' ? 'Copilot' : 'You'}:</strong> {message.content}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="grid">
        <textarea
          rows={4}
          placeholder="Ask a question..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Thinking...' : 'Ask Copilot'}
        </button>
      </form>
      {error ? <p>{error}</p> : null}
    </div>
  );
}
