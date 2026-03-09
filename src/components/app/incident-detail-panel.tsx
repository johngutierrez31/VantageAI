'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function splitCsv(value: string) {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

type ReviewerOption = { id: string; label: string };
type RunbookOption = { id: string; title: string };

type IncidentDetailProps = {
  incident: {
    id: string;
    title: string;
    description: string;
    incidentType: string;
    severity: string;
    status: string;
    detectionSource: string | null;
    reportedBy: string | null;
    incidentOwnerUserId: string | null;
    communicationsOwnerUserId: string | null;
    affectedSystems: string[];
    affectedServices: string[];
    affectedVendorNames: string[];
    executiveSummary: string | null;
    internalNotes: string | null;
    startedAt: string;
    nextUpdateDueAt: string | null;
    aiUseCase: { id: string; name: string } | null;
    aiVendorReview: { id: string; vendorName: string } | null;
    questionnaireUpload: { id: string; label: string } | null;
    trustInboxItem: { id: string; title: string } | null;
    linkedFindingIds: string[];
    linkedRiskIds: string[];
    timelineEvents: Array<{ id: string; eventType: string; title: string; detail: string | null; isShareable: boolean; createdAt: string }>;
    runbookPacks: Array<{ id: string; title: string; runbookId: string; status: string; tasks: Array<{ id: string; title: string; status: string; priority: string; assignee: string | null; dueDate: string | null; responseOpsPhase: string | null }> }>;
    tasks: Array<{ id: string; title: string; status: string; priority: string; assignee: string | null; dueDate: string | null; responseOpsPhase: string | null }>;
    findings: Array<{ id: string; title: string; status: string; priority: string; sourceType: string }>;
    afterActionReport: { id: string; status: string; summary: string; affectedScope: string; currentStatus: string; lessonsLearned: string[]; followUpActions: string[]; decisionsNeeded: string[]; reviewerNotes: string | null; exportCount: number } | null;
  };
  risks: Array<{ id: string; title: string; severity: string; status: string; targetDueAt: string | null }>;
  reviewers: ReviewerOption[];
  runbooks: RunbookOption[];
};

export function IncidentDetailPanel({ incident, risks, reviewers, runbooks }: IncidentDetailProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [incidentForm, setIncidentForm] = useState({
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    status: incident.status,
    detectionSource: incident.detectionSource ?? '',
    reportedBy: incident.reportedBy ?? '',
    incidentOwnerUserId: incident.incidentOwnerUserId ?? '',
    communicationsOwnerUserId: incident.communicationsOwnerUserId ?? '',
    nextUpdateDueAt: toDateTimeLocal(incident.nextUpdateDueAt),
    affectedSystems: incident.affectedSystems.join(', '),
    affectedServices: incident.affectedServices.join(', '),
    affectedVendorNames: incident.affectedVendorNames.join(', '),
    executiveSummary: incident.executiveSummary ?? '',
    internalNotes: incident.internalNotes ?? ''
  });
  const [timelineForm, setTimelineForm] = useState({ eventType: 'NOTE', title: '', detail: '', isShareable: false });
  const [runbookForm, setRunbookForm] = useState({ runbookId: runbooks[0]?.id ?? '', assignee: incident.incidentOwnerUserId ?? '' });
  const [afterActionNotes, setAfterActionNotes] = useState(incident.afterActionReport?.reviewerNotes ?? '');

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

  const openTasks = incident.tasks.filter((task) => task.status !== 'DONE').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={incident.title}
        helpKey="incidentDetail"
        description="First-hour triage, incident-linked runbook packs, decision trail, and review-gated after-action reporting."
        primaryAction={{ label: 'Open Response Ops', href: '/app/response-ops' }}
        secondaryActions={[
          { label: 'Findings', href: '/app/findings', variant: 'outline' },
          { label: 'Pulse', href: '/app/pulse', variant: 'outline' },
          { label: 'Runbooks', href: '/app/runbooks', variant: 'outline' }
        ]}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusPill status={incident.incidentType} />
          <StatusPill status={incident.severity} />
          <StatusPill status={incident.status} />
          <span>Started {new Date(incident.startedAt).toLocaleString()}</span>
        </div>
      </PageHeader>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open Tasks" value={String(openTasks)} hint={`${incident.runbookPacks.length} pack(s)`} />
        <KpiCard label="Timeline Events" value={String(incident.timelineEvents.length)} hint="Durable decision trail" />
        <KpiCard label="Linked Findings" value={String(incident.linkedFindingIds.length)} hint={`${risks.length} linked risk(s)`} />
        <KpiCard label="After-Action" value={incident.afterActionReport ? incident.afterActionReport.status : 'Not started'} hint={incident.afterActionReport ? `${incident.afterActionReport.exportCount} export(s)` : 'Generate review artifact'} />
      </div>

      <DataTable
        title="Incident Controls"
        description="Update ownership, severity, and the next checkpoint without leaving the incident record."
        actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => run('save-incident', async () => { await apiRequest(`/api/response-ops/incidents/${incident.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: incidentForm.title, description: incidentForm.description, severity: incidentForm.severity, status: incidentForm.status, detectionSource: incidentForm.detectionSource || null, reportedBy: incidentForm.reportedBy || null, incidentOwnerUserId: incidentForm.incidentOwnerUserId || null, communicationsOwnerUserId: incidentForm.communicationsOwnerUserId || null, nextUpdateDueAt: incidentForm.nextUpdateDueAt ? new Date(incidentForm.nextUpdateDueAt).toISOString() : null, affectedSystems: splitCsv(incidentForm.affectedSystems), affectedServices: splitCsv(incidentForm.affectedServices), affectedVendorNames: splitCsv(incidentForm.affectedVendorNames), executiveSummary: incidentForm.executiveSummary || null, internalNotes: incidentForm.internalNotes || null }) }); })} disabled={busy !== null}>{busy === 'save-incident' ? 'Saving...' : 'Save Incident'}</Button><Button variant="outline" onClick={() => run('launch-pack', async () => { await apiRequest(`/api/response-ops/incidents/${incident.id}/runbook-packs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runbookId: runbookForm.runbookId || null, assignee: runbookForm.assignee || null }) }); })} disabled={busy !== null}>{busy === 'launch-pack' ? 'Launching...' : 'Launch Runbook Pack'}</Button><Button onClick={() => run('after-action-generate', async () => { await apiRequest(`/api/response-ops/incidents/${incident.id}/after-action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); })} disabled={busy !== null}>{busy === 'after-action-generate' ? 'Generating...' : incident.afterActionReport ? 'Refresh After-Action' : 'Draft After-Action'}</Button></div>}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input value={incidentForm.title} onChange={(event) => setIncidentForm((current) => ({ ...current, title: event.target.value }))} placeholder="Incident title" />
          <Select value={incidentForm.status} onChange={(event) => setIncidentForm((current) => ({ ...current, status: event.target.value }))}><option value="NEW">NEW</option><option value="TRIAGE">TRIAGE</option><option value="ACTIVE">ACTIVE</option><option value="CONTAINED">CONTAINED</option><option value="RECOVERING">RECOVERING</option><option value="RESOLVED">RESOLVED</option><option value="POST_INCIDENT_REVIEW">POST_INCIDENT_REVIEW</option><option value="ARCHIVED">ARCHIVED</option></Select>
          <Select value={incidentForm.severity} onChange={(event) => setIncidentForm((current) => ({ ...current, severity: event.target.value }))}><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option></Select>
          <Input type="datetime-local" value={incidentForm.nextUpdateDueAt} onChange={(event) => setIncidentForm((current) => ({ ...current, nextUpdateDueAt: event.target.value }))} />
        </div>
        <Textarea className="mt-3" value={incidentForm.description} onChange={(event) => setIncidentForm((current) => ({ ...current, description: event.target.value }))} placeholder="Incident description" />
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input value={incidentForm.detectionSource} onChange={(event) => setIncidentForm((current) => ({ ...current, detectionSource: event.target.value }))} placeholder="Detection source" />
          <Input value={incidentForm.reportedBy} onChange={(event) => setIncidentForm((current) => ({ ...current, reportedBy: event.target.value }))} placeholder="Reported by" />
          <Select value={incidentForm.incidentOwnerUserId} onChange={(event) => setIncidentForm((current) => ({ ...current, incidentOwnerUserId: event.target.value }))}><option value="">Incident owner</option>{reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.label}</option>)}</Select>
          <Select value={incidentForm.communicationsOwnerUserId} onChange={(event) => setIncidentForm((current) => ({ ...current, communicationsOwnerUserId: event.target.value }))}><option value="">Communications owner</option>{reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.label}</option>)}</Select>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Input value={incidentForm.affectedSystems} onChange={(event) => setIncidentForm((current) => ({ ...current, affectedSystems: event.target.value }))} placeholder="Affected systems" />
          <Input value={incidentForm.affectedServices} onChange={(event) => setIncidentForm((current) => ({ ...current, affectedServices: event.target.value }))} placeholder="Affected services" />
          <Input value={incidentForm.affectedVendorNames} onChange={(event) => setIncidentForm((current) => ({ ...current, affectedVendorNames: event.target.value }))} placeholder="Affected vendors" />
        </div>
        <Textarea className="mt-3" value={incidentForm.executiveSummary} onChange={(event) => setIncidentForm((current) => ({ ...current, executiveSummary: event.target.value }))} placeholder="Executive summary" />
        <Textarea className="mt-3" value={incidentForm.internalNotes} onChange={(event) => setIncidentForm((current) => ({ ...current, internalNotes: event.target.value }))} placeholder="Internal notes" />
        <div className="mt-3 grid gap-3 md:grid-cols-2"><Select value={runbookForm.runbookId} onChange={(event) => setRunbookForm((current) => ({ ...current, runbookId: event.target.value }))}>{runbooks.map((runbook) => <option key={runbook.id} value={runbook.id}>{runbook.title}</option>)}</Select><Select value={runbookForm.assignee} onChange={(event) => setRunbookForm((current) => ({ ...current, assignee: event.target.value }))}><option value="">Default assignee</option>{reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.label}</option>)}</Select></div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {incident.aiUseCase ? <Link href={`/app/ai-governance/use-cases/${incident.aiUseCase.id}`} className="underline">AI use case: {incident.aiUseCase.name}</Link> : null}
          {incident.aiVendorReview ? <Link href={`/app/ai-governance/vendors/${incident.aiVendorReview.id}`} className="underline">AI vendor: {incident.aiVendorReview.vendorName}</Link> : null}
          {incident.questionnaireUpload ? <Link href={`/app/questionnaires/${incident.questionnaireUpload.id}`} className="underline">Questionnaire: {incident.questionnaireUpload.label}</Link> : null}
          {incident.trustInboxItem ? <Link href={`/app/trust/inbox/${incident.trustInboxItem.id}`} className="underline">Trust item: {incident.trustInboxItem.title}</Link> : null}
        </div>
      </DataTable>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DataTable title="Incident Timeline" description="Durable incident events and decision points.">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={timelineForm.eventType} onChange={(event) => setTimelineForm((current) => ({ ...current, eventType: event.target.value }))}><option value="NOTE">NOTE</option><option value="DECISION_LOG">DECISION_LOG</option><option value="COMMUNICATION_SENT">COMMUNICATION_SENT</option><option value="STATUS_CHANGED">STATUS_CHANGED</option><option value="CONTAINMENT_COMPLETED">CONTAINMENT_COMPLETED</option></Select>
              <Input value={timelineForm.title} onChange={(event) => setTimelineForm((current) => ({ ...current, title: event.target.value }))} placeholder="Timeline event title" />
            </div>
            <Textarea value={timelineForm.detail} onChange={(event) => setTimelineForm((current) => ({ ...current, detail: event.target.value }))} placeholder="Event detail" />
            <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={timelineForm.isShareable} onChange={(event) => setTimelineForm((current) => ({ ...current, isShareable: event.target.checked }))} />Include this event in shareable summaries.</label>
            <Button variant="outline" onClick={() => run('timeline', async () => { await apiRequest(`/api/response-ops/incidents/${incident.id}/timeline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventType: timelineForm.eventType, title: timelineForm.title, detail: timelineForm.detail || null, isShareable: timelineForm.isShareable }) }); setTimelineForm({ eventType: 'NOTE', title: '', detail: '', isShareable: false }); })} disabled={busy !== null || timelineForm.title.trim().length < 3}>{busy === 'timeline' ? 'Saving...' : 'Add Timeline Event'}</Button>
            <div className="space-y-3">{incident.timelineEvents.map((event) => <div key={event.id} className="rounded-md border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">{event.title}</p><p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()} | {event.eventType.replace(/_/g, ' ')}</p></div><div className="flex items-center gap-2"><StatusPill status={event.eventType} /><StatusPill status={event.isShareable ? 'shared' : 'internal'} /></div></div>{event.detail ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{event.detail}</p> : null}</div>)}</div>
          </div>
        </DataTable>

        <DataTable title="Linked Findings and Risks" description="Response outcomes feed shared remediation and executive visibility.">
          <div className="space-y-3">
            <div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Findings</p><div className="mt-2 space-y-2">{incident.findings.length ? incident.findings.map((finding) => <div key={finding.id} className="rounded-md border border-border bg-background/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{finding.title}</p><div className="flex items-center gap-2"><StatusPill status={finding.priority} /><StatusPill status={finding.status} /></div></div><p className="mt-1 text-xs text-muted-foreground">{finding.sourceType.replace(/_/g, ' ')}</p></div>) : <p className="text-sm text-muted-foreground">No incident-linked findings recorded yet.</p>}</div></div>
            <div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Risk Register</p><div className="mt-2 space-y-2">{risks.length ? risks.map((risk) => <div key={risk.id} className="rounded-md border border-border bg-background/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{risk.title}</p><div className="flex items-center gap-2"><StatusPill status={risk.severity} /><StatusPill status={risk.status} /></div></div><p className="mt-1 text-xs text-muted-foreground">{risk.targetDueAt ? `Target ${new Date(risk.targetDueAt).toLocaleDateString()}` : 'No target date'}</p></div>) : <p className="text-sm text-muted-foreground">No incident-linked risks recorded yet.</p>}</div></div>
          </div>
        </DataTable>
      </div>

      <DataTable title="Runbook Packs and Tasks" description="Incident-linked pack generation remains durable and auditable.">
        <div className="space-y-4">
          {incident.runbookPacks.length ? incident.runbookPacks.map((pack) => <div key={pack.id} className="rounded-md border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">{pack.title}</p><p className="text-xs text-muted-foreground">Runbook {pack.runbookId}</p></div><StatusPill status={pack.status} /></div><div className="mt-3 space-y-2">{pack.tasks.map((task) => <div key={task.id} className="grid gap-2 rounded-md border border-border bg-background/60 p-3 md:grid-cols-[1.3fr_120px_130px]"><div><p className="text-sm font-medium">{task.title}</p><p className="text-xs text-muted-foreground">{task.responseOpsPhase ? task.responseOpsPhase.replace(/_/g, ' ') : 'General'}{task.dueDate ? ` | due ${new Date(task.dueDate).toLocaleString()}` : ''}{task.assignee ? ` | owner ${task.assignee}` : ''}</p></div><Select value={task.status} onChange={(event) => run(`task-${task.id}`, async () => { await apiRequest(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: event.target.value }) }); })}><option value="TODO">TODO</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="BLOCKED">BLOCKED</option><option value="DONE">DONE</option></Select><div className="flex items-center gap-2"><StatusPill status={task.priority} /><StatusPill status={task.status} /></div></div>)}</div></div>) : <p className="text-sm text-muted-foreground">No incident-linked runbook pack has been launched yet.</p>}
        </div>
      </DataTable>
      <DataTable title="After-Action Report" description="Review-gated report for executive-ready incident closeout.">
        {incident.afterActionReport ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2"><StatusPill status={incident.afterActionReport.status} /><span className="text-sm text-muted-foreground">{incident.afterActionReport.exportCount} export(s)</span></div>
            <p className="text-sm text-muted-foreground">{incident.afterActionReport.summary}</p>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Affected Scope</p><p className="mt-2 text-sm text-muted-foreground">{incident.afterActionReport.affectedScope}</p><p className="mt-3 text-sm font-semibold">Current Status</p><p className="mt-1 text-sm text-muted-foreground">{incident.afterActionReport.currentStatus}</p></div>
              <div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Reviewer Notes</p><Textarea className="mt-2" value={afterActionNotes} onChange={(event) => setAfterActionNotes(event.target.value)} placeholder="Reviewer notes" /><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => run('after-action-save', async () => { await apiRequest(`/api/response-ops/after-action/${incident.afterActionReport!.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewerNotes: afterActionNotes || null }) }); })} disabled={busy !== null}>{busy === 'after-action-save' ? 'Saving...' : 'Save Notes'}</Button><Button variant="outline" onClick={() => run('after-action-review', async () => { await apiRequest(`/api/response-ops/after-action/${incident.afterActionReport!.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'NEEDS_REVIEW', reviewerNotes: afterActionNotes || null }) }); })} disabled={busy !== null}>{busy === 'after-action-review' ? 'Saving...' : 'Mark Needs Review'}</Button><Button onClick={() => run('after-action-approve', async () => { await apiRequest(`/api/response-ops/after-action/${incident.afterActionReport!.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'APPROVED', reviewerNotes: afterActionNotes || null }) }); })} disabled={busy !== null}>{busy === 'after-action-approve' ? 'Saving...' : 'Approve Report'}</Button></div></div>
            </div>
            <div className="grid gap-4 xl:grid-cols-3"><div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Lessons Learned</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{incident.afterActionReport.lessonsLearned.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Follow-Up Actions</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{incident.afterActionReport.followUpActions.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="rounded-md border border-border p-3"><p className="text-sm font-semibold">Decisions Needed</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{incident.afterActionReport.decisionsNeeded.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
            <div className="flex flex-wrap gap-2"><Button asChild variant="outline" disabled={incident.afterActionReport.status !== 'APPROVED'}><a href={`/api/response-ops/after-action/${incident.afterActionReport.id}/export?format=html`}>Export HTML</a></Button><Button asChild variant="outline" disabled={incident.afterActionReport.status !== 'APPROVED'}><a href={`/api/response-ops/after-action/${incident.afterActionReport.id}/export?format=markdown`}>Export Markdown</a></Button><Button asChild variant="outline" disabled={incident.afterActionReport.status !== 'APPROVED'}><a href={`/api/response-ops/after-action/${incident.afterActionReport.id}/export?format=json`}>Export JSON</a></Button></div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Generate the first after-action report once the incident record and task pack are in place.</p>
        )}
      </DataTable>
    </div>
  );
}

