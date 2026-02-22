'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AssessmentCreateForm({ templates }: { templates: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [name, setName] = useState('Initial Assessment');
  const [customerName, setCustomerName] = useState('Acme Corp');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, customerName, templateId })
    });
    const json = await res.json();
    router.push(`/app/assessments/${json.id}`);
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3>New assessment</h3>
      <input value={name} onChange={(e) => setName(e.target.value)} required />
      <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <button type="submit">Create assessment</button>
    </form>
  );
}
