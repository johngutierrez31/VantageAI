'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { SecurityRunbook } from '@/lib/intel/runbooks';
import { workflowRoutes } from '@/lib/product/workflow-routes';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type IncidentOption = {
  id: string;
  title: string;
  status: string;
  severity: string;
};

function severityClasses(value: SecurityRunbook['severity']) {
  if (value === 'critical') return 'border-danger/40 bg-danger/10 text-danger';
  if (value === 'high') return 'border-warning/50 bg-warning/10 text-warning';
  return 'border-border bg-muted/20 text-muted-foreground';
}

function incidentTypeForRunbook(runbookId: string) {
  if (runbookId === 'identity-compromise') return 'IDENTITY_COMPROMISE';
  if (runbookId === 'ransomware-extortion') return 'RANSOMWARE';
  if (runbookId === 'third-party-breach') return 'THIRD_PARTY_BREACH';
  return 'OTHER';
}

function incidentSeverityForRunbook(runbook: SecurityRunbook) {
  if (runbook.severity === 'critical') return 'CRITICAL';
  if (runbook.severity === 'high') return 'HIGH';
  return 'MEDIUM';
}

function buildIncidentDraft(runbook: SecurityRunbook, assignee: string) {
  return {
    incidentType: incidentTypeForRunbook(runbook.id),
    severity: incidentSeverityForRunbook(runbook),
    title: `${runbook.title} response draft`,
    description: `${runbook.objective}\n\nScenario focus: ${runbook.scenarios.join('; ')}`,
    detectionSource: 'Runbook launcher',
    guidedStart: true,
    launchRunbookPack: true,
    runbookId: runbook.id,
    assignee: assignee || null
  };
}

export function RunbooksPanel({
  activeWorkflow,
  initialIncidentId,
  incidents,
  runbooks
}: {
  activeWorkflow: string | null;
  initialIncidentId: string | null;
  incidents: IncidentOption[];
  runbooks: SecurityRunbook[];
}) {
  const router = useRouter();
  const [assignee, setAssignee] = useState('');
  const [selectedIncidentId, setSelectedIncidentId] = useState(
    initialIncidentId && incidents.some((incident) => incident.id === initialIncidentId) ? initialIncidentId : '__new__'
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId]
  );

  async function launchRunbook(runbook: SecurityRunbook) {
    setBusyId(runbook.id);
    setMessage(null);
    setError(null);

    try {
      if (selectedIncidentId === '__new__') {
        const response = await fetch('/api/response-ops/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildIncidentDraft(runbook, assignee))
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(payload.error ?? 'Failed to create incident-linked runbook pack');
          return;
        }

        setMessage('Created a new incident draft and launched the runbook pack.');
        router.push(`/app/response-ops/incidents/${payload.incident.id}`);
        return;
      }

      const response = await fetch(`/api/response-ops/incidents/${selectedIncidentId}/runbook-packs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runbookId: runbook.id,
          assignee: assignee || null
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? 'Failed to launch incident-linked runbook pack');
        return;
      }

      setMessage(
        `Launched ${runbook.title} against ${selectedIncident?.title ?? 'the selected incident'} and kept the task pack anchored to that record.`
      );
      router.push(`/app/response-ops/incidents/${selectedIncidentId}`);
    } catch {
      setError('Failed to launch the runbook pack due to a network or server issue.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card id="runbook-launcher" className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle>Launch Incident-Linked Task Pack</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Runbook packs always attach to a named incident record so the timeline, findings, after-action work, and Pulse carry-over all keep the same source anchor.
          </p>
          <div className="grid gap-3 md:grid-cols-[1fr_260px]">
            <Select value={selectedIncidentId} onChange={(event) => setSelectedIncidentId(event.target.value)}>
              <option value="__new__">Create new incident draft</option>
              {incidents.map((incident) => (
                <option key={incident.id} value={incident.id}>
                  {incident.title} | {incident.severity} | {incident.status}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Optional assignee applied to created tasks"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            />
          </div>
          <div className="rounded-md border border-border bg-background/70 p-3 text-sm text-muted-foreground">
            {selectedIncident
              ? `Selected anchor: ${selectedIncident.title}. Launching a runbook from this page will add a new incident-linked pack to that record.`
              : 'Selected anchor: create a new incident draft. Launching a runbook from this page will open the new incident and attach the first task pack automatically.'}
          </div>
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </CardContent>
      </Card>

      {runbooks.map((runbook) => (
        <Card
          key={runbook.id}
          className={cn(activeWorkflow === runbook.id ? 'border-primary/50 bg-primary/5 shadow-sm' : null)}
        >
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
              <Button onClick={() => launchRunbook(runbook)} disabled={busyId === runbook.id} type="button">
                {busyId === runbook.id ? 'Launching...' : 'Launch task pack'}
              </Button>
              <Button asChild variant="outline">
                <Link
                  href={workflowRoutes.runbookLauncher(
                    runbook.id,
                    selectedIncidentId === '__new__' ? null : selectedIncidentId
                  )}
                >
                  Open Workflow
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href={workflowRoutes.responseIncidentTriage(runbook.id)}>Create incident draft</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
