'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { TasksPanel } from '@/components/app/tasks-panel';
import { ExceptionsPanel } from '@/components/app/exceptions-panel';
import { EvidenceRequestsPanel } from '@/components/app/evidence-requests-panel';
import { ResponseEditor } from '@/components/response-editor';
import { ReportPanel } from '@/components/report-panel';
import { EvidenceVaultPanel } from '@/components/evidence-vault-panel';
import { QuestionnaireImportPanel } from '@/components/questionnaire-import-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ControlCoverage = {
  controlCode: string;
  domain: string;
  title: string;
  weight: number;
  averageScore: number;
  coverage: number;
  evidenceCount: number;
  status: 'OPEN' | 'PARTIAL' | 'COVERED';
  evidenceTier: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
};

type Question = {
  id: string;
  prompt: string;
  weight: number;
  control: { domain: string; code: string };
};

type Props = {
  assessment: {
    id: string;
    name: string;
    customerName: string;
    status: string;
    templateName: string;
    updatedAt: string;
  };
  score: {
    overall: number;
    confidence: number;
    byDomain: Record<string, number>;
    gaps: Array<{ domain: string; controlCode: string; score: number; recommendation: string }>;
  };
  scoreDelta: number | null;
  controls: ControlCoverage[];
  questions: Question[];
  tasks: Array<{
    id: string;
    title: string;
    controlCode: string | null;
    assignee: string | null;
    dueDate: string | null;
    status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  exceptions: Array<{
    id: string;
    assessmentId: string;
    controlCode: string;
    reason: string;
    owner: string | null;
    approver: string | null;
    dueDate: string | null;
    status: 'OPEN' | 'ACCEPTED' | 'CLOSED';
  }>;
  evidenceRequests: Array<{
    id: string;
    assessmentId: string | null;
    title: string;
    details: string | null;
    assignee: string | null;
    status: 'REQUESTED' | 'RECEIVED' | 'COMPLETE';
    dueDate: string | null;
  }>;
  initialTab?: string;
};

const tabs = ['summary', 'controls', 'evidence', 'report'] as const;
type Tab = (typeof tabs)[number];

export function AssessmentWorkspace({
  assessment,
  score,
  scoreDelta,
  controls,
  questions,
  tasks,
  exceptions,
  evidenceRequests,
  initialTab
}: Props) {
  const router = useRouter();
  const defaultTab = tabs.includes((initialTab as Tab) ?? 'summary') ? (initialTab as Tab) : 'summary';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [taskActionMessage, setTaskActionMessage] = useState<string | null>(null);
  const [busyControlCode, setBusyControlCode] = useState<string | null>(null);

  const groupedControls = useMemo(() => {
    const groups = new Map<string, ControlCoverage[]>();
    for (const control of controls) {
      const bucket = groups.get(control.domain) ?? [];
      bucket.push(control);
      groups.set(control.domain, bucket);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [controls]);

  async function createTaskFromControl(control: ControlCoverage) {
    setBusyControlCode(control.controlCode);
    setTaskActionMessage(null);

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: assessment.id,
        title: `Close gap: ${control.controlCode}`,
        controlCode: control.controlCode,
        description: `Remediate ${control.controlCode} (${control.title}) in ${control.domain}.`,
        priority: control.status === 'OPEN' ? 'HIGH' : 'MEDIUM'
      })
    });

    setBusyControlCode(null);
    if (!response.ok) {
      setTaskActionMessage('Unable to create task from control.');
      return;
    }

    setTaskActionMessage(`Task created for ${control.controlCode}.`);
    setActiveTab('summary');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={assessment.name}
        description={`Customer: ${assessment.customerName} - Template: ${assessment.templateName}`}
      >
        <div className="flex items-center gap-2">
          <StatusPill status={assessment.status} />
          <span className="text-xs text-muted-foreground">
            Last updated {new Date(assessment.updatedAt).toLocaleString()}
          </span>
        </div>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-4">
        <KpiCard label="Overall Score" value={`${score.overall}/4`} hint="Deterministic weighted score" />
        <KpiCard label="Confidence" value={`${Math.round(score.confidence * 100)}%`} hint="Response confidence blend" />
        <KpiCard
          label="Delta vs Previous"
          value={scoreDelta === null ? 'N/A' : `${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(2)}`}
          hint="Same customer reassessment delta"
        />
        <KpiCard label="Open Gaps" value={`${score.gaps.length}`} hint="Controls scored at 2 or below" />
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-3">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </CardContent>
      </Card>

      {activeTab === 'summary' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan of Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {score.gaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No critical open controls detected.</p>
              ) : (
                score.gaps.slice(0, 6).map((gap) => (
                  <div key={`${gap.controlCode}-${gap.domain}`} className="rounded-md border border-border p-3">
                    <p className="text-sm font-semibold">
                      {gap.controlCode} - {gap.domain} - {gap.score}/4
                    </p>
                    <p className="text-sm text-muted-foreground">{gap.recommendation}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <TasksPanel assessmentId={assessment.id} tasks={tasks} />
          <ExceptionsPanel assessmentId={assessment.id} exceptions={exceptions} />
        </div>
      ) : null}

      {activeTab === 'controls' ? (
        <div className="space-y-4">
          {groupedControls.map(([domain, items]) => (
            <Card key={domain}>
              <CardHeader>
                <CardTitle>{domain}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Control</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Maturity</TableHead>
                      <TableHead>Evidence Tier</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((control) => (
                      <TableRow key={`${control.domain}-${control.controlCode}`}>
                        <TableCell>
                          <p className="font-medium">
                            {control.controlCode} - {control.title}
                          </p>
                        </TableCell>
                        <TableCell><StatusPill status={control.status} /></TableCell>
                        <TableCell>{control.averageScore.toFixed(2)} / 4</TableCell>
                        <TableCell>{control.evidenceTier}</TableCell>
                        <TableCell>{Math.round(control.coverage * 100)}%</TableCell>
                        <TableCell>{control.weight}</TableCell>
                        <TableCell>Security Ops</TableCell>
                        <TableCell>{control.status === 'OPEN' ? '14 days' : '30 days'}</TableCell>
                        <TableCell>
                          {control.status === 'OPEN' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyControlCode === control.controlCode}
                              onClick={() => createTaskFromControl(control)}
                            >
                              {busyControlCode === control.controlCode ? 'Creating...' : 'Create task'}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No action needed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {taskActionMessage ? <p className="mt-3 text-sm text-muted-foreground">{taskActionMessage}</p> : null}
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader>
              <CardTitle>Response Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponseEditor assessmentId={assessment.id} questions={questions} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'evidence' ? (
        <div className="space-y-4">
          <EvidenceVaultPanel />
          <EvidenceRequestsPanel assessmentId={assessment.id} requests={evidenceRequests} />
          <Card>
            <CardHeader>
              <CardTitle>Questionnaire Import</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionnaireImportPanel
                assessmentId={assessment.id}
                questions={questions.map((question) => ({ id: question.id, prompt: question.prompt }))}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'report' ? (
        <div className="space-y-4">
          <ReportPanel assessmentId={assessment.id} />
        </div>
      ) : null}
    </div>
  );
}
