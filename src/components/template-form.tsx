'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

export function TemplateForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [framework, setFramework] = useState<'Security' | 'AI'>('Security');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const controlPrefix = framework === 'AI' ? 'AI' : 'SEC';
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        versionTitle: 'V1',
        controls: [
          {
            domain: framework === 'AI' ? 'AI Governance' : 'Governance',
            code: `${controlPrefix}-${Date.now()}`,
            title: framework === 'AI' ? 'AI oversight baseline' : 'Security baseline control',
            weight: 1,
            questions: [{ prompt: 'Describe your current implementation approach.', rubric: '0-4', weight: 1 }]
          }
        ]
      })
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to create template');
      return;
    }

    router.push('/app/tools');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Template</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Template name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Security Readiness (V2)" required />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Framework</span>
            <Select value={framework} onChange={(event) => setFramework(event.target.value as 'Security' | 'AI')}>
              <option value="Security">Security</option>
              <option value="AI">AI</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Description</span>
            <Textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <Button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create template'}</Button>
          {message ? <p className="text-sm text-danger">{message}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
