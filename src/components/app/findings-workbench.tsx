'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { DataTable } from '@/components/app/data-table';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type TaskItem = {
  id: string;
  title: string;
  controlCode: string | null;
  assignee: string | null;
  dueDate: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
};

type ExceptionItem = {
  id: string;
  controlCode: string;
  reason: string;
  owner: string | null;
  approver: string | null;
  dueDate: string | null;
  status: 'OPEN' | 'ACCEPTED' | 'CLOSED';
};

type GapItem = {
  assessmentName: string;
  controlCode: string;
  domain: string;
  score: number;
  recommendation: string;
};

type ReviewerOption = {
  id: string;
  label: string;
};

type TrustFindingItem = {
  id: string;
  title: string;
  description: string;
  sourceType:
    | 'TRUSTOPS_EVIDENCE_GAP'
    | 'TRUSTOPS_REJECTION'
    | 'TRUSTOPS_EVIDENCE_MAP'
    | 'AI_GOVERNANCE_HIGH_RISK'
    | 'AI_GOVERNANCE_REJECTION'
    | 'AI_VENDOR_REVIEW'
    | 'RESPONSE_OPS_INCIDENT'
    | 'RESPONSE_OPS_AFTER_ACTION'
    | 'RESPONSE_OPS_TABLETOP';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  supportStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'MISSING' | null;
  controlCode: string | null;
  ownerUserId: string | null;
  questionnaireUpload: { id: string; label: string } | null;
  evidenceMap: { id: string; name: string } | null;
  aiUseCase: { id: string; name: string } | null;
  aiVendorReview: { id: string; label: string } | null;
  incident: { id: string; title: string } | null;
  tabletopExercise: { id: string; title: string } | null;
  task: { id: string; title: string } | null;
  updatedAt: string;
};

export function FindingsWorkbench({
  tasks: initialTasks,
  exceptions: initialExceptions,
  trustFindings: initialTrustFindings,
  reviewers,
  topGaps
}: {
  tasks: TaskItem[];
  exceptions: ExceptionItem[];
  trustFindings: TrustFindingItem[];
  reviewers: ReviewerOption[];
  topGaps: GapItem[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [trustFindings, setTrustFindings] = useState(initialTrustFindings);
  const [findingDrafts, setFindingDrafts] = useState<
    Record<string, { status: TrustFindingItem['status']; priority: TrustFindingItem['priority']; ownerUserId: string }>
  >({});
  const [findingBusyId, setFindingBusyId] = useState<string | null>(null);

  async function updateTaskStatus(taskId: string, status: TaskItem['status']) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) return;
    const updated = await response.json();
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
  }

  async function updateExceptionStatus(exceptionId: string, status: ExceptionItem['status']) {
    const response = await fetch(`/api/exceptions/${exceptionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) return;
    const updated = await response.json();
    setExceptions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function saveTrustFinding(finding: TrustFindingItem) {
    const draft = findingDrafts[finding.id] ?? {
      status: finding.status,
      priority: finding.priority,
      ownerUserId: finding.ownerUserId ?? ''
    };

    setFindingBusyId(finding.id);
    const response = await fetch(`/api/findings/${finding.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: draft.status,
        priority: draft.priority,
        ownerUserId: draft.ownerUserId || null
      })
    });
    setFindingBusyId(null);
    if (!response.ok) return;

    const updated = await response.json();
    setTrustFindings((prev) =>
      prev.map((item) =>
        item.id === updated.id
          ? {
              ...item,
              status: updated.status,
              priority: updated.priority,
              ownerUserId: updated.ownerUserId
            }
          : item
      )
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Findings / Gaps"
        helpKey="findings"
        description="Central view for risk priorities, remediation tasks, and accepted exceptions."
        primaryAction={{ label: 'Create Assessment', href: '/app/assessments/new' }}
      />

      <DataTable title="Top Gaps" description="Highest-priority controls with low maturity scores.">
        {topGaps.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No open gaps yet.</p>
        ) : (
          <div className="space-y-2">
            {topGaps.map((gap, index) => (
              <div key={`${gap.assessmentName}-${gap.controlCode}-${index}`} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {gap.controlCode} - {gap.domain}
                    </p>
                    <p className="text-xs text-muted-foreground">{gap.assessmentName}</p>
                  </div>
                  <StatusPill status={gap.score <= 1 ? 'OPEN' : 'PARTIAL'} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{gap.recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </DataTable>

      <DataTable
        title="Cross-Module Findings"
        description="TrustOps, AI Governance, and Response Ops issues are promoted into durable findings so they can feed Pulse and owned remediation."
      >
        {trustFindings.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No findings recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {trustFindings.map((finding) => {
              const draft = findingDrafts[finding.id] ?? {
                status: finding.status,
                priority: finding.priority,
                ownerUserId: finding.ownerUserId ?? ''
              };

              return (
                <div key={finding.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{finding.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {finding.sourceType.replace(/_/g, ' ')} | Updated {new Date(finding.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={finding.priority} />
                      <StatusPill status={finding.status} />
                      {finding.supportStrength ? <StatusPill status={finding.supportStrength} /> : null}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{finding.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {finding.controlCode ? <span>Control: {finding.controlCode}</span> : null}
                    {finding.questionnaireUpload ? (
                      <Link href={`/app/questionnaires/${finding.questionnaireUpload.id}`} className="underline">
                        Questionnaire: {finding.questionnaireUpload.label}
                      </Link>
                    ) : null}
                    {finding.evidenceMap ? (
                      <Link href={`/app/trust/evidence-maps/${finding.evidenceMap.id}`} className="underline">
                        Evidence Map: {finding.evidenceMap.name}
                      </Link>
                    ) : null}
                    {finding.aiUseCase ? (
                      <Link href={`/app/ai-governance/use-cases/${finding.aiUseCase.id}`} className="underline">
                        AI Use Case: {finding.aiUseCase.name}
                      </Link>
                    ) : null}
                    {finding.aiVendorReview ? (
                      <Link href={`/app/ai-governance/vendors/${finding.aiVendorReview.id}`} className="underline">
                        AI Vendor: {finding.aiVendorReview.label}
                      </Link>
                    ) : null}
                    {finding.incident ? (
                      <Link href={`/app/response-ops/incidents/${finding.incident.id}`} className="underline">
                        Incident: {finding.incident.title}
                      </Link>
                    ) : null}
                    {finding.tabletopExercise ? (
                      <Link href={`/app/response-ops/tabletops/${finding.tabletopExercise.id}`} className="underline">
                        Tabletop: {finding.tabletopExercise.title}
                      </Link>
                    ) : null}
                    {finding.task ? (
                      <Link href="/app/findings" className="underline">
                        Related Task: {finding.task.title}
                      </Link>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-[170px_170px_220px_auto]">
                    <Select
                      value={draft.status}
                      onChange={(event) =>
                        setFindingDrafts((current) => ({
                          ...current,
                          [finding.id]: {
                            ...draft,
                            status: event.target.value as TrustFindingItem['status']
                          }
                        }))
                      }
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="ARCHIVED">Archived</option>
                    </Select>
                    <Select
                      value={draft.priority}
                      onChange={(event) =>
                        setFindingDrafts((current) => ({
                          ...current,
                          [finding.id]: {
                            ...draft,
                            priority: event.target.value as TrustFindingItem['priority']
                          }
                        }))
                      }
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </Select>
                    <Select
                      value={draft.ownerUserId}
                      onChange={(event) =>
                        setFindingDrafts((current) => ({
                          ...current,
                          [finding.id]: {
                            ...draft,
                            ownerUserId: event.target.value
                          }
                        }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {reviewers.map((reviewer) => (
                        <option key={reviewer.id} value={reviewer.id}>
                          {reviewer.label}
                        </option>
                      ))}
                    </Select>
                    <div className="flex justify-end">
                      <Button onClick={() => saveTrustFinding(finding)} disabled={findingBusyId === finding.id}>
                        {findingBusyId === finding.id ? 'Saving...' : 'Save Finding'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DataTable>

      <DataTable title="Task Workflow" description="Convert findings into assigned, trackable remediation work.">
        {tasks.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No tasks created yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Control</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{task.controlCode ?? '-'}</TableCell>
                  <TableCell>{task.assignee ?? 'Unassigned'}</TableCell>
                  <TableCell>{task.priority}</TableCell>
                  <TableCell>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <StatusPill status={task.status} />
                    <Select
                      className="h-8 w-[140px]"
                      value={task.status}
                      onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskItem['status'])}
                    >
                      <option value="TODO">To do</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="BLOCKED">Blocked</option>
                      <option value="DONE">Done</option>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>

      <DataTable title="Exception Governance" description="Accepted risks require owner, approver, and expiry tracking.">
        {exceptions.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No exceptions recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Control</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptions.map((exception) => (
                <TableRow key={exception.id}>
                  <TableCell>{exception.controlCode}</TableCell>
                  <TableCell>{exception.reason}</TableCell>
                  <TableCell>{exception.owner ?? 'Unassigned'}</TableCell>
                  <TableCell>{exception.approver ?? 'Not set'}</TableCell>
                  <TableCell>{exception.dueDate ? new Date(exception.dueDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <StatusPill status={exception.status} />
                    <Select
                      className="h-8 w-[140px]"
                      value={exception.status}
                      onChange={(event) =>
                        updateExceptionStatus(exception.id, event.target.value as ExceptionItem['status'])
                      }
                    >
                      <option value="OPEN">Open</option>
                      <option value="ACCEPTED">Accepted</option>
                      <option value="CLOSED">Closed</option>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>

      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/app/overview">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
}

