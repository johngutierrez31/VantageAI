'use client';

import { useState } from 'react';
import type { SecurityRunbook } from '@/lib/intel/runbooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SeedResponse = {
  createdCount?: number;
  error?: string;
};

function severityClasses(value: SecurityRunbook['severity']) {
  if (value === 'critical') return 'border-danger/40 bg-danger/10 text-danger';
  if (value === 'high') return 'border-warning/50 bg-warning/10 text-warning';
  return 'border-border bg-muted/20 text-muted-foreground';
}

export function RunbooksPanel({ runbooks }: { runbooks: SecurityRunbook[] }) {
  const [assignee, setAssignee] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function seedRunbook(runbookId: string) {
    setBusyId(runbookId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/intel/runbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runbookId,
          assignee: assignee || undefined
        })
      });

      const payload = (await response.json().catch(() => null)) as SeedResponse | null;
      if (!response.ok) {
        setError(payload?.error ?? 'Failed to create runbook tasks');
        return;
      }

      setMessage(`Created ${payload?.createdCount ?? 0} tasks from runbook.`);
    } catch {
      setError('Failed to create runbook tasks due to a network or server issue.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Runbook Automation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Instantiate vetted response task packs for common high-pressure scenarios.
          </p>
          <Input
            placeholder="Optional assignee applied to created tasks"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
          />
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </CardContent>
      </Card>

      {runbooks.map((runbook) => (
        <Card key={runbook.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2">
              <span>{runbook.title}</span>
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${severityClasses(runbook.severity)}`}>
                {runbook.severity.toUpperCase()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{runbook.objective}</p>
            <p className="text-xs text-muted-foreground">Scenarios: {runbook.scenarios.join(' | ')}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {runbook.tasks.map((task) => (
                <li key={`${runbook.id}-${task.title}`}>
                  [{task.priority}] {task.title}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => seedRunbook(runbook.id)} disabled={busyId === runbook.id} type="button">
                {busyId === runbook.id ? 'Creating...' : 'Create task pack'}
              </Button>
              <Button asChild variant="outline">
                <a href={runbook.linkedRoute}>Open Workflow</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

