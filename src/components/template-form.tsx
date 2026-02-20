'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TemplateForm() {
  const router = useRouter();
  const [name, setName] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: 'Custom template',
        versionTitle: 'V1',
        controls: [
          {
            domain: 'Governance',
            code: `CTRL-${Date.now()}`,
            title: 'New Control',
            weight: 1,
            questions: [{ prompt: 'Describe your approach.', rubric: '0-4', weight: 1 }]
          }
        ]
      })
    });
    router.push('/app/templates');
    router.refresh();
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h3>New template</h3>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" required />
      <button type="submit">Create</button>
    </form>
  );
}
