'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload ? String((payload as { error?: unknown }).error ?? '') : text || `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function splitLines(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

type TabletopDetailProps = {
  tabletop: {
    id: string;
    title: string;
    scenarioType: string;
    status: string;
    exerciseDate: string;
    participantNames: string[];
    participantRoles: string[];
    scenarioSummary: string;
    exerciseObjectives: string[];
    expectedDecisions: string[];
    exerciseNotes: string | null;
    decisionsMade: string[];
    gapsIdentified: string[];
    followUpActions: string[];
    reviewerNotes: string | null;
    tasks: Array<{ id: string; title: string; status: string; priority: string; dueDate: string | null }>;
    findings: Array<{ id: string; title: string; status: string; priority: string; sourceType: string }>;
  };
  risks: Array<{ id: string; title: string; severity: string; status: string; targetDueAt: string | null }>;
};

export function TabletopDetailPanel({ tabletop, risks }: TabletopDetailProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: tabletop.title,
    status: tabletop.status,
    exerciseDate: toDateTimeLocal(tabletop.exerciseDate),
    participantNames: tabletop.participantNames.join('\n'),
    participantRoles: tabletop.participantRoles.join('\n'),
    exerciseNotes: tabletop.exerciseNotes ?? '',
    decisionsMade: tabletop.decisionsMade.join('\n'),
    gapsIdentified: tabletop.gapsIdentified.join('\n'),
    followUpActions: tabletop.followUpActions.join('\n'),
    reviewerNotes: tabletop.reviewerNotes ?? ''
  });

  async function run(actionId: string, callback: () => Promise<void>) {
    setBusy(actionId);
    setError(null);
    try {
      await callback();
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tabletop.title}
        helpKey="tabletopDetail"
        description="Lightweight exercise workflow for readiness checks, gap capture, and follow-up creation."
        primaryAction={{ label: 'Open Response Ops', href: '/app/response-ops' }}
        secondaryActions={[
          { label: 'Findings', href: '/app/findings', variant: 'outline' },
          { label: 'Pulse', href: '/app/pulse', variant: 'outline' }
        ]}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusPill status={tabletop.scenarioType} />
          <StatusPill status={tabletop.status} />
          <span>{new Date(tabletop.exerciseDate).toLocaleString()}</span>
        </div>
      </PageHeader>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Follow-Up Tasks" value={String(tabletop.tasks.length)} hint="Created from exercise gaps" />
        <KpiCard label="Linked Findings" value={String(tabletop.findings.length)} hint={`${risks.length} linked risk(s)`} />
        <KpiCard label="Participants" value={String(tabletop.participantNames.length)} hint="Named exercise attendees" />
        <KpiCard label="Decision Points" value={String(tabletop.expectedDecisions.length)} hint="Scenario prompts prepared" />
      </div>

      <DataTable
        title="Exercise Controls"
        description="Update participation, notes, gaps, and completion state."
        actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => run('save', async () => { await apiRequest(`/api/response-ops/tabletops/${tabletop.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.title, status: form.status, exerciseDate: new Date(form.exerciseDate).toISOString(), participantNames: splitLines(form.participantNames), participantRoles: splitLines(form.participantRoles), exerciseNotes: form.exerciseNotes || null, decisionsMade: splitLines(form.decisionsMade), gapsIdentified: splitLines(form.gapsIdentified), followUpActions: splitLines(form.followUpActions), reviewerNotes: form.reviewerNotes || null }) }); })} disabled={busy !== null}>{busy === 'save' ? 'Saving...' : 'Save Exercise'}</Button><Button onClick={() => run('complete', async () => { await apiRequest(`/api/response-ops/tabletops/${tabletop.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'COMPLETED', exerciseDate: new Date(form.exerciseDate).toISOString(), participantNames: splitLines(form.participantNames), participantRoles: splitLines(form.participantRoles), exerciseNotes: form.exerciseNotes || null, decisionsMade: splitLines(form.decisionsMade), gapsIdentified: splitLines(form.gapsIdentified), followUpActions: splitLines(form.followUpActions), reviewerNotes: form.reviewerNotes || null }) }); })} disabled={busy !== null}>{busy === 'complete' ? 'Completing...' : 'Complete Tabletop'}</Button></div>}
      >
        <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Exercise title" />
        <div className="mt-3 grid gap-3 md:grid-cols-2"><Input type="datetime-local" value={form.exerciseDate} onChange={(event) => setForm((current) => ({ ...current, exerciseDate: event.target.value }))} /><Input value={tabletop.scenarioType} disabled /></div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <Textarea value={form.participantNames} onChange={(event) => setForm((current) => ({ ...current, participantNames: event.target.value }))} placeholder="Participants, one per line" />
          <Textarea value={form.participantRoles} onChange={(event) => setForm((current) => ({ ...current, participantRoles: event.target.value }))} placeholder="Participant roles, one per line" />
        </div>
        <Textarea className="mt-3" value={form.exerciseNotes} onChange={(event) => setForm((current) => ({ ...current, exerciseNotes: event.target.value }))} placeholder="Exercise notes" />
      </DataTable>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DataTable title="Scenario Inputs" description={tabletop.scenarioSummary}>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Exercise Objectives</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{tabletop.exerciseObjectives.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Expected Decisions</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{tabletop.expectedDecisions.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2"><Textarea value={form.decisionsMade} onChange={(event) => setForm((current) => ({ ...current, decisionsMade: event.target.value }))} placeholder="Decisions made, one per line" /><Textarea value={form.gapsIdentified} onChange={(event) => setForm((current) => ({ ...current, gapsIdentified: event.target.value }))} placeholder="Gaps identified, one per line" /></div>
          <div className="mt-3 grid gap-3 xl:grid-cols-2"><Textarea value={form.followUpActions} onChange={(event) => setForm((current) => ({ ...current, followUpActions: event.target.value }))} placeholder="Follow-up actions, one per line" /><Textarea value={form.reviewerNotes} onChange={(event) => setForm((current) => ({ ...current, reviewerNotes: event.target.value }))} placeholder="Reviewer notes" /></div>
        </DataTable>

        <DataTable title="Follow-Up Signals" description="Completed exercises create durable tasks, findings, and risks.">
          <div className="space-y-3">
            <div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Findings</p><div className="mt-2 space-y-2">{tabletop.findings.length ? tabletop.findings.map((finding) => <div key={finding.id} className="rounded-md border border-border bg-background/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{finding.title}</p><div className="flex items-center gap-2"><StatusPill status={finding.priority} /><StatusPill status={finding.status} /></div></div><p className="mt-1 text-xs text-muted-foreground">{finding.sourceType.replace(/_/g, ' ')}</p></div>) : <p className="text-sm text-muted-foreground">No tabletop-linked findings recorded yet.</p>}</div></div>
            <div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Risks</p><div className="mt-2 space-y-2">{risks.length ? risks.map((risk) => <div key={risk.id} className="rounded-md border border-border bg-background/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{risk.title}</p><div className="flex items-center gap-2"><StatusPill status={risk.severity} /><StatusPill status={risk.status} /></div></div><p className="mt-1 text-xs text-muted-foreground">{risk.targetDueAt ? `Target ${new Date(risk.targetDueAt).toLocaleDateString()}` : 'No target date'}</p></div>) : <p className="text-sm text-muted-foreground">No tabletop-linked risks recorded yet.</p>}</div></div>
            <div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Follow-Up Tasks</p><div className="mt-2 space-y-2">{tabletop.tasks.length ? tabletop.tasks.map((task) => <div key={task.id} className="grid gap-2 rounded-md border border-border bg-background/60 p-3 md:grid-cols-[1.3fr_120px_120px]"><div><p className="text-sm font-medium">{task.title}</p><p className="text-xs text-muted-foreground">{task.dueDate ? `Due ${new Date(task.dueDate).toLocaleString()}` : 'No due date'}</p></div><select className="ui-select flex h-12 w-full rounded-md border border-border bg-card px-4 py-2 text-base text-foreground" value={task.status} onChange={(event) => run(`task-${task.id}`, async () => { await apiRequest(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: event.target.value }) }); })}><option value="TODO">TODO</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="BLOCKED">BLOCKED</option><option value="DONE">DONE</option></select><div className="flex items-center gap-2"><StatusPill status={task.priority} /><StatusPill status={task.status} /></div></div>) : <p className="text-sm text-muted-foreground">No tabletop follow-up tasks exist yet.</p>}</div></div>
          </div>
        </DataTable>
      </div>
    </div>
  );
}

