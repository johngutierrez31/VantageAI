'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TemplateActions({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);
    await fetch(`/api/templates/${templateId}/publish`, { method: 'POST' });
    setBusy(false);
    router.refresh();
  }

  async function createMinorVersion() {
    setBusy(true);
    await fetch(`/api/templates/${templateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Version ${new Date().toISOString()}`,
        notes: 'Quick draft version from UI',
        controls: [
          {
            domain: 'Governance',
            code: `CTRL-${Date.now()}`,
            title: 'Versioned control',
            weight: 1,
            questions: [{ prompt: 'What changed since previous version?', rubric: '0-4', weight: 1 }]
          }
        ]
      })
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button onClick={publish} disabled={busy}>Publish latest</button>
      <button onClick={createMinorVersion} disabled={busy}>Create new version</button>
    </div>
  );
}
