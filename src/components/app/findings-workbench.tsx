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

export function FindingsWorkbench({
  tasks: initialTasks,
  exceptions: initialExceptions,
  topGaps
}: {
  tasks: TaskItem[];
  exceptions: ExceptionItem[];
  topGaps: GapItem[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [exceptions, setExceptions] = useState(initialExceptions);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Findings / Gaps"
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
