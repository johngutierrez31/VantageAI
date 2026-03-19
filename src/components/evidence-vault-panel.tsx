'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill } from '@/components/app/status-pill';

type EvidenceItem = {
  id: string;
  name: string;
  tags: string[];
  ingestionStatus: string;
  chunkCount: number;
  linkCount: number;
  createdAt: string;
};

export function EvidenceVaultPanel() {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEvidence() {
    const response = await fetch('/api/evidence');
    if (!response.ok) return;
    const json = await response.json();
    setItems(json);
  }

  useEffect(() => {
    void loadEvidence();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch('/api/evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        content,
        tags: tags
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      })
    });

    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? 'Failed to ingest evidence');
      setBusy(false);
      return;
    }

    setName('');
    setContent('');
    setTags('');
    setBusy(false);
    await loadEvidence();
  }

  const staleCount = useMemo(() => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return items.filter((item) => new Date(item.createdAt).getTime() < ninetyDaysAgo).length;
  }, [items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence Vault</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          {items.length} total evidence item(s) - {staleCount} stale (&gt;90 days)
        </div>

        <form onSubmit={onSubmit} className="grid gap-2">
          <Input
            placeholder="Evidence title"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Textarea
            rows={4}
            placeholder="Paste policy text, controls, evidence notes, or document extract"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
          />
          <Input
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
          <Button type="submit" disabled={busy}>
            {busy ? 'Ingesting...' : 'Add evidence'}
          </Button>
        </form>
        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Evidence Vault is for storing reusable proof, not loose notes. Add one policy, control artifact, or review memo to create a durable evidence record that other workflows can cite and package safely.
            </p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.chunkCount} chunk(s) - linked to {item.linkCount} control/response item(s)
                    </p>
                  </div>
                  <StatusPill status={item.ingestionStatus} />
                </div>
                {item.tags.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">Tags: {item.tags.join(', ')}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
