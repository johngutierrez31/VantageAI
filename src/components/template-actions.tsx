'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function TemplateActions({ templateId, status }: { templateId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);
    await fetch(`/api/templates/${templateId}/publish`, { method: 'POST' });
    setBusy(false);
    router.refresh();
  }

  async function unpublish() {
    setBusy(true);
    await fetch(`/api/templates/${templateId}/publish`, { method: 'DELETE' });
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

  async function duplicate() {
    setBusy(true);
    await fetch(`/api/templates/${templateId}/duplicate`, { method: 'POST' });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'PUBLISHED' ? (
        <Button onClick={unpublish} disabled={busy} variant="outline">
          Unpublish
        </Button>
      ) : (
        <Button onClick={publish} disabled={busy}>
          Publish latest
        </Button>
      )}
      <Button onClick={createMinorVersion} disabled={busy} variant="outline">
        Create new version
      </Button>
      <Button onClick={duplicate} disabled={busy} variant="secondary">
        Duplicate
      </Button>
    </div>
  );
}
