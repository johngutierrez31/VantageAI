'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, Flame, Loader2, Radio, ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { KpiCard } from '@/components/app/kpi-card';
import { StatusPill } from '@/components/app/status-pill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type ReviewerOption = {
  id: string;
  label: string;
};

type ScenarioOption = {
  incidentType:
    | 'IDENTITY_COMPROMISE'
    | 'RANSOMWARE'
    | 'PHISHING'
    | 'THIRD_PARTY_BREACH'
    | 'CLOUD_EXPOSURE'
    | 'LOST_DEVICE'
    | 'AI_MISUSE'
    | 'OTHER';
  label: string;
  description: string;
  defaultSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedRunbookId: string | null;
};

type IncidentSummary = {
  id: string;
  title: string;
  incidentType: string;
  severity: string;
  status: string;
  nextUpdateDueAt: string | null;
  updatedAt: string;
  linkedFindingIds: string[];
  linkedRiskIds: string[];
  runbookPacks: Array<{ id: string; title: string; status: string }>;
  afterActionReports: Array<{ id: string; status: string }>;
};

type TabletopSummary = {
  id: string;
  title: string;
  scenarioType: string;
  status: string;
  exerciseDate: string;
  linkedFindingIds: string[];
  linkedRiskIds: string[];
  linkedTaskIds: string[];
};

type ReportSummary = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  incident: {
    id: string;
    title: string;
    severity: string;
  };
};

type Metrics = {
  activeIncidents: number;
  triageIncidents: number;
  overdueIncidentActions: number;
  openPostIncidentActions: number;
  upcomingTabletops: number;
  recentAfterActionReports: number;
};

async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.error ?? text ?? `Request failed with ${response.status}`);
  }
  return payload;
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ResponseOpsDashboardPanel({
  metrics,
  incidents,
  tabletops,
  reports,
  reviewers,
  scenarios
}: {
  metrics: Metrics;
  incidents: IncidentSummary[];
  tabletops: TabletopSummary[];
  reports: ReportSummary[];
  reviewers: ReviewerOption[];
  scenarios: ScenarioOption[];
}) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [incidentForm, setIncidentForm] = useState({
    incidentType: scenarios[0]?.incidentType ?? 'IDENTITY_COMPROMISE',
    severity: scenarios[0]?.defaultSeverity ?? 'HIGH',
    title: '',
    description: '',
    detectionSource: '',
    incidentOwnerUserId: '',
    communicationsOwnerUserId: '',
    guidedStart: true
  });
  const [tabletopForm, setTabletopForm] = useState({
    scenarioType: scenarios[0]?.incidentType ?? 'RANSOMWARE',
    title: '',
    participantNames: '',
    participantRoles: ''
  });
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<'ALL' | IncidentSummary['status']>('ALL');
  const [tabletopStatusFilter, setTabletopStatusFilter] = useState<'ALL' | TabletopSummary['status']>('ALL');

  const filteredIncidents = useMemo(() => {
    const search = incidentSearch.trim().toLowerCase();
    return incidents.filter((incident) => {
      const matchesSearch =
        !search ||
        incident.title.toLowerCase().includes(search) ||
        incident.incidentType.toLowerCase().includes(search) ||
        incident.severity.toLowerCase().includes(search) ||
        incident.status.toLowerCase().includes(search);
      const matchesStatus = incidentStatusFilter === 'ALL' || incident.status === incidentStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [incidentSearch, incidentStatusFilter, incidents]);

  const filteredTabletops = useMemo(
    () =>
      tabletops.filter(
        (tabletop) => tabletopStatusFilter === 'ALL' || tabletop.status === tabletopStatusFilter
      ),
    [tabletopStatusFilter, tabletops]
  );

  async function run(actionId: string, callback: () => Promise<void>) {
    setBusyAction(actionId);
    setError(null);
    try {
      await callback();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Response Ops"
        helpKey="responseOps"
        description="Run first-hour incident triage, launch incident-linked runbook packs, capture decision trails, draft after-action reports, and turn exercises into owned follow-up."
        primaryAction={{ label: 'Open Command Center', href: '/app/command-center' }}
        secondaryActions={[
          { label: 'Runbooks', href: '/app/runbooks', variant: 'outline' },
          { label: 'Findings', href: '/app/findings', variant: 'outline' },
          { label: 'Pulse', href: '/app/pulse', variant: 'outline' },
          { label: 'AI Governance', href: '/app/ai-governance', variant: 'outline' }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          label="Active Incidents"
          value={String(metrics.activeIncidents)}
          hint={`${metrics.triageIncidents} in triage`}
          icon={<Flame className="h-5 w-5" />}
        />
        <KpiCard
          label="Overdue Incident Actions"
          value={String(metrics.overdueIncidentActions)}
          hint="Open incident-linked tasks past due"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <KpiCard
          label="Open Post-Incident Actions"
          value={String(metrics.openPostIncidentActions)}
          hint="After-action follow-ups still open"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <KpiCard
          label="Upcoming Tabletops"
          value={String(metrics.upcomingTabletops)}
          hint="Draft exercises in next 30 days"
          icon={<Radio className="h-5 w-5" />}
        />
        <KpiCard
          label="After-Action Reports"
          value={String(metrics.recentAfterActionReports)}
          hint="Durable incident review artifacts"
          icon={<ScrollText className="h-5 w-5" />}
        />
        <div className="flex items-center">
          <Button asChild size="sm" variant="outline">
            <Link href="/app/copilot">Open Copilot</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guided Response Ops Workflows</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            ['Start Incident Triage', 'Creates a durable incident record, first-hour decision scaffold, and incident-linked runbook pack.'],
            ['Launch Runbook Task Pack', 'Generates phase-based incident tasks for triage, containment, communications, recovery, and follow-up.'],
            ['Update Incident Timeline', 'Adds durable timeline and decision-log entries without mixing internal-only notes into shareable summaries.'],
            ['Draft After-Action Report', 'Builds a persisted review artifact from the incident record, timeline, tasks, findings, and risks.'],
            ['Prepare Tabletop Exercise', 'Creates a lightweight exercise record with scenario prompts, gaps, decisions, and follow-up capture.']
          ].map(([title, description]) => (
            <div key={title} className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-danger">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Start Incident Triage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Scenario</p>
                <Select
                  value={incidentForm.incidentType}
                  onChange={(event) => {
                    const scenario = scenarios.find((item) => item.incidentType === event.target.value);
                    setIncidentForm((current) => ({
                      ...current,
                      incidentType: event.target.value as typeof current.incidentType,
                      severity: scenario?.defaultSeverity ?? current.severity
                    }));
                  }}
                >
                  {scenarios.map((scenario) => (
                    <option key={scenario.incidentType} value={scenario.incidentType}>
                      {scenario.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Severity</p>
                <Select
                  value={incidentForm.severity}
                  onChange={(event) =>
                    setIncidentForm((current) => ({
                      ...current,
                      severity: event.target.value as typeof current.severity
                    }))
                  }
                >
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Input
              placeholder="Optional incident title"
              value={incidentForm.title}
              onChange={(event) => setIncidentForm((current) => ({ ...current, title: event.target.value }))}
            />
            <Textarea
              placeholder="Optional operator notes or scenario detail"
              value={incidentForm.description}
              onChange={(event) => setIncidentForm((current) => ({ ...current, description: event.target.value }))}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Detection source"
                value={incidentForm.detectionSource}
                onChange={(event) =>
                  setIncidentForm((current) => ({ ...current, detectionSource: event.target.value }))
                }
              />
              <Select
                value={incidentForm.incidentOwnerUserId}
                onChange={(event) =>
                  setIncidentForm((current) => ({ ...current, incidentOwnerUserId: event.target.value }))
                }
              >
                <option value="">Incident owner</option>
                {reviewers.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.label}
                  </option>
                ))}
              </Select>
              <Select
                value={incidentForm.communicationsOwnerUserId}
                onChange={(event) =>
                  setIncidentForm((current) => ({
                    ...current,
                    communicationsOwnerUserId: event.target.value
                  }))
                }
              >
                <option value="">Communications owner</option>
                {reviewers.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.label}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={incidentForm.guidedStart}
                onChange={(event) =>
                  setIncidentForm((current) => ({ ...current, guidedStart: event.target.checked }))
                }
              />
              Generate guided first-hour triage scaffold and launch the recommended runbook pack.
            </label>
            <Button
              onClick={() =>
                run('create-incident', async () => {
                  const created = await apiRequest('/api/response-ops/incidents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      incidentType: incidentForm.incidentType,
                      severity: incidentForm.severity,
                      title: incidentForm.title || undefined,
                      description: incidentForm.description || undefined,
                      detectionSource: incidentForm.detectionSource || undefined,
                      incidentOwnerUserId: incidentForm.incidentOwnerUserId || null,
                      communicationsOwnerUserId: incidentForm.communicationsOwnerUserId || null,
                      guidedStart: incidentForm.guidedStart,
                      launchRunbookPack: incidentForm.guidedStart
                    })
                  });
                  router.push(`/app/response-ops/incidents/${created.incident.id}`);
                })
              }
              disabled={busyAction !== null}
            >
              {busyAction === 'create-incident' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Start Incident Triage
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prepare Tabletop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={tabletopForm.scenarioType}
              onChange={(event) =>
                setTabletopForm((current) => ({
                  ...current,
                  scenarioType: event.target.value as typeof current.scenarioType
                }))
              }
            >
              {scenarios.map((scenario) => (
                <option key={scenario.incidentType} value={scenario.incidentType}>
                  {scenario.label}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Optional tabletop title"
              value={tabletopForm.title}
              onChange={(event) => setTabletopForm((current) => ({ ...current, title: event.target.value }))}
            />
            <Input
              placeholder="Participants (comma separated)"
              value={tabletopForm.participantNames}
              onChange={(event) =>
                setTabletopForm((current) => ({ ...current, participantNames: event.target.value }))
              }
            />
            <Input
              placeholder="Participant roles (comma separated)"
              value={tabletopForm.participantRoles}
              onChange={(event) =>
                setTabletopForm((current) => ({ ...current, participantRoles: event.target.value }))
              }
            />
            <Button
              onClick={() =>
                run('create-tabletop', async () => {
                  const created = await apiRequest('/api/response-ops/tabletops', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      scenarioType: tabletopForm.scenarioType,
                      title: tabletopForm.title || undefined,
                      participantNames: splitCsv(tabletopForm.participantNames),
                      participantRoles: splitCsv(tabletopForm.participantRoles)
                    })
                  });
                  router.push(`/app/response-ops/tabletops/${created.id}`);
                })
              }
              disabled={busyAction !== null}
            >
              {busyAction === 'create-tabletop' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Prepare Tabletop Exercise
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Open Incident Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <Input
                placeholder="Search incidents by title, type, severity, or status"
                value={incidentSearch}
                onChange={(event) => setIncidentSearch(event.target.value)}
              />
              <Select
                value={incidentStatusFilter}
                onChange={(event) =>
                  setIncidentStatusFilter(event.target.value as 'ALL' | IncidentSummary['status'])
                }
              >
                <option value="ALL">All statuses</option>
                {['NEW', 'TRIAGE', 'ACTIVE', 'CONTAINED', 'RECOVERING', 'RESOLVED', 'POST_INCIDENT_REVIEW', 'ARCHIVED'].map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  )
                )}
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Showing {filteredIncidents.length} of {incidents.length} incident record(s).
            </p>
            {filteredIncidents.length ? (
              filteredIncidents.map((incident) => (
                <div key={incident.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{incident.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {incident.incidentType.replace(/_/g, ' ')} | Updated{' '}
                        {new Date(incident.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={incident.severity} />
                      <StatusPill status={incident.status} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{incident.runbookPacks.length} runbook pack(s)</span>
                    <span>{incident.linkedFindingIds.length} linked finding(s)</span>
                    <span>{incident.linkedRiskIds.length} linked risk(s)</span>
                    {incident.nextUpdateDueAt ? (
                      <span>Next update due {new Date(incident.nextUpdateDueAt).toLocaleString()}</span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/app/response-ops/incidents/${incident.id}`}>Open Incident</Link>
                    </Button>
                    {incident.afterActionReports[0] ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/app/response-ops/incidents/${incident.id}`}>Open After-Action</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No incident records match the current filter.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent After-Action Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.length ? (
                reports.map((report) => (
                  <div key={report.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{report.title}</p>
                      <StatusPill status={report.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.incident.title} | {report.incident.severity} | Updated{' '}
                      {new Date(report.updatedAt).toLocaleString()}
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href={`/app/response-ops/incidents/${report.incident.id}`}>Open Incident Review</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No after-action reports generated yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tabletop Cadence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={tabletopStatusFilter}
                onChange={(event) =>
                  setTabletopStatusFilter(event.target.value as 'ALL' | TabletopSummary['status'])
                }
              >
                <option value="ALL">All tabletop statuses</option>
                {['DRAFT', 'COMPLETED', 'ARCHIVED'].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Showing {filteredTabletops.length} of {tabletops.length} tabletop record(s).
              </p>
              {filteredTabletops.length ? (
                filteredTabletops.map((tabletop) => (
                  <div key={tabletop.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{tabletop.title}</p>
                      <StatusPill status={tabletop.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tabletop.scenarioType.replace(/_/g, ' ')} | {new Date(tabletop.exerciseDate).toLocaleString()}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {tabletop.linkedFindingIds.length} finding(s) | {tabletop.linkedRiskIds.length} risk(s) |{' '}
                      {tabletop.linkedTaskIds.length} task(s)
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href={`/app/response-ops/tabletops/${tabletop.id}`}>Open Tabletop</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tabletop exercises match the current filter.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

