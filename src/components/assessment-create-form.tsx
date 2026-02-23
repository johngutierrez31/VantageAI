'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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
      <Card>
        <CardHeader>
          <CardTitle>New assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No templates available yet. Go to Templates and create one first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment details</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Assessment name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q1 2026 Security Readiness"
              minLength={3}
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Customer name</span>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Acme Corp"
              minLength={2}
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Template</span>
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </label>
          <Button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create assessment'}</Button>
          {message ? <p className="text-sm text-danger">{message}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
