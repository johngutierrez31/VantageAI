'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AssessmentCreateForm({ templates }: { templates: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId) {
      setMessage('Create or publish a template first, then create an assessment.');
      return;
    }

    setBusy(true);
    setMessage(null);

    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, customerName, templateId })
    });
    const json = await res.json();

    if (!res.ok) {
      setBusy(false);
      setMessage(json.error ?? 'Failed to create assessment.');
      return;
    }

    router.push(`/app/assessments/${json.id}`);
  }

  if (templates.length === 0) {
    return (
      <div className="card">
        <h3>New assessment</h3>
        <p>No templates available yet. Go to Templates and create one first.</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3>New assessment</h3>
      <label>
        Assessment name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Q1 2026 Security Readiness"
          minLength={3}
          required
        />
      </label>
      <label>
        Customer name
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Acme Corp"
          minLength={2}
          required
        />
      </label>
      <label>
        Template
      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      </label>
      <button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create assessment'}</button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
