'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Link2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { KpiCard } from '@/components/app/kpi-card';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type StartPath = {
  id: string;
  title: string;
  description: string;
  href: string;
  outcome: string;
};

type ConnectorOption = {
  id: string;
  name: string;
  provider: string;
  status: string;
};

type ReviewerOption = {
  id: string;
  label: string;
};

type ImportSummary = {
  id: string;
  target: string;
  source: string;
  status: string;
  createdCount: number;
  failedCount: number;
  summary: string;
  sourceLabel: string | null;
  createdAt: string;
  connector?: {
    id: string;
    name: string;
    provider: string;
  } | null;
};

type ValueGraphStep = {
  id: string;
  label: string;
  helper: string;
  href: string;
};

function formatTargetLabel(value: string) {
  return value.toLowerCase().replace(/_/g, ' ');
}

function getImportPlaceholder(target: string, source: string) {
  const manualExamples: Record<string, string> = {
    FINDINGS: [
      'title | description | priority | status | controlCode',
      'Privileged access review gap | Quarterly admin review still depends on manual exports. | HIGH | OPEN | IAM-1'
    ].join('\n'),
    RISKS: [
      'title | description | businessImpactSummary | severity | likelihood | impact | status',
      'Customer trust narrative is fragmented | Executive story still depends on manual assembly across tools. | Delayed buyer responses and board prep. | HIGH | MEDIUM | HIGH | OPEN'
    ].join('\n'),
    APPROVED_ANSWERS: [
      'questionText | answerText | scope',
      'Do you enforce MFA for privileged access? | Yes. MFA is enforced for privileged accounts and reviewed quarterly. | REUSABLE'
    ].join('\n'),
    INCIDENTS: [
      'title | description | incidentType | severity | status | detectionSource',
      'Suspicious Okta admin session | Admin login originated from an unexpected region. | IDENTITY_COMPROMISE | HIGH | ACTIVE | SIEM'
    ].join('\n')
  };

  const csvExamples: Record<string, string> = {
    FINDINGS: [
      'title,description,priority,status,controlCode',
      '"Access review gap","Quarterly access review evidence is not centralized.",HIGH,OPEN,IAM-1'
    ].join('\n'),
    RISKS: [
      'title,description,businessImpactSummary,severity,likelihood,impact,status',
      '"Board reporting is fragmented","Leadership reporting still depends on manual stitching.","Low confidence in current posture narrative.",MEDIUM,MEDIUM,MEDIUM,OPEN'
    ].join('\n'),
    APPROVED_ANSWERS: [
      'questionText,answerText,scope',
      '"Do you maintain approved security policies?","Approved security policies are maintained centrally with named owners.",REUSABLE'
    ].join('\n'),
    INCIDENTS: [
      'title,description,incidentType,severity,status,detectionSource',
      '"Third-party notice received","Vendor reported suspicious retention behavior.",THIRD_PARTY_BREACH,HIGH,TRIAGE,Vendor'
    ].join('\n')
  };

  return source === 'MANUAL' ? manualExamples[target] : csvExamples[target];
}

export function AdoptionModePanel({
  metrics,
  startPaths,
  valueGraph,
  imports,
  connectors,
  reviewers
}: {
  metrics: {
    connectorCount: number;
    importCount: number;
    approvedAnswerCount: number;
    openFindingCount: number;
    openRiskCount: number;
    incidentCount: number;
  };
  startPaths: StartPath[];
  valueGraph: ValueGraphStep[];
  imports: ImportSummary[];
  connectors: ConnectorOption[];
  reviewers: ReviewerOption[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<'FINDINGS' | 'RISKS' | 'APPROVED_ANSWERS' | 'INCIDENTS'>('FINDINGS');
  const [source, setSource] = useState<'MANUAL' | 'CSV' | 'CONNECTOR_EXPORT'>('MANUAL');
  const [content, setContent] = useState(getImportPlaceholder('FINDINGS', 'MANUAL'));
  const [connectorId, setConnectorId] = useState(connectors[0]?.id ?? '');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [approvedAnswerScope, setApprovedAnswerScope] = useState<'REUSABLE' | 'TENANT_SPECIFIC'>('REUSABLE');
  const [incidentType, setIncidentType] = useState<
    'IDENTITY_COMPROMISE' | 'RANSOMWARE' | 'PHISHING' | 'THIRD_PARTY_BREACH' | 'CLOUD_EXPOSURE' | 'LOST_DEVICE' | 'AI_MISUSE' | 'OTHER'
  >('OTHER');
  const [incidentSeverity, setIncidentSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedConnector = useMemo(
    () => connectors.find((connector) => connector.id === connectorId) ?? null,
    [connectorId, connectors]
  );

  const currentPlaceholder = useMemo(() => getImportPlaceholder(target, source), [source, target]);

  async function submitImport() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/adoption/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          source,
          content,
          connectorId: source === 'CONNECTOR_EXPORT' ? connectorId : undefined,
          sourceLabel: source === 'CONNECTOR_EXPORT' ? selectedConnector?.name : undefined,
          ownerUserId: ownerUserId || undefined,
          approvedAnswerScope: target === 'APPROVED_ANSWERS' ? approvedAnswerScope : undefined,
          incidentType: target === 'INCIDENTS' ? incidentType : undefined,
          incidentSeverity: target === 'INCIDENTS' ? incidentSeverity : undefined
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error ?? 'Import failed');
        return;
      }

      const failures = Array.isArray(payload.results)
        ? payload.results.filter((result: { error?: string }) => result.error).length
        : 0;

      setMessage(
        failures
          ? `${payload.record.summary} Review the recent import log for ${failures} row issue${failures === 1 ? '' : 's'}.`
          : payload.record.summary
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adoption Mode"
        helpKey="adoptionMode"
        description="Run Vantage as the security operating layer across your existing stack: import what already exists, connect the systems your team already uses, and make the cross-module carry-over visible."
        primaryAction={{ label: 'Configure Connectors', href: '/app/settings/connectors' }}
        secondaryActions={[
          { label: 'Open Command Center', href: '/app/command-center', variant: 'outline' },
          { label: 'Tools Hub', href: '/app/tools', variant: 'outline' },
          { label: 'TrustOps', href: '/app/trust', variant: 'outline' },
          { label: 'Pulse', href: '/app/pulse', variant: 'outline' }
        ]}
      >
        <p className="text-xs text-muted-foreground">
          Keep Jira, Slack, Confluence, spreadsheets, and existing process ownership where they already work. Use Vantage to connect trust work, risk, executive reporting, incidents, and AI review into one operating layer.
        </p>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Configured Connectors"
          value={String(metrics.connectorCount)}
          hint="Slack, Jira, publishing, and webhook integrations already in the workspace"
          icon={<Link2 className="h-5 w-5" />}
        />
        <KpiCard
          label="Imported Records"
          value={String(metrics.importCount)}
          hint="Durable adoption imports with tenant-scoped audit history"
          icon={<Upload className="h-5 w-5" />}
        />
        <KpiCard
          label="Reusable Trust Answers"
          value={String(metrics.approvedAnswerCount)}
          hint="Approved answer library entries ready to reduce questionnaire rework"
          icon={<ArrowRight className="h-5 w-5" />}
        />
        <KpiCard
          label="Carry-Over Pressure"
          value={String(metrics.openFindingCount + metrics.openRiskCount + metrics.incidentCount)}
          hint={`${metrics.openFindingCount} findings | ${metrics.openRiskCount} risks | ${metrics.incidentCount} incidents`}
          icon={<Link2 className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Start Here</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {startPaths.map((path) => (
              <div key={path.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold">{path.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{path.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">Outcome: {path.outcome}</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href={path.href}>Open Path</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work With Your Existing Stack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-md border border-border p-3">
              Keep your execution systems.
              <p className="mt-1">
                Continue using Slack, Jira, Confluence, exported spreadsheets, and existing review owners. Vantage does not require a rip-and-replace decision to become useful.
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              Make the carry-over visible.
              <p className="mt-1">
                Trust pressure, executive risk, AI decisions, and incident follow-up stay linked so teams can explain what changed and what still needs ownership.
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              Adopt in slices.
              <p className="mt-1">
                Start with one urgent workflow, import what already exists, and expand into the rest of the operating layer once the value graph is visible.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Value Carry-Over</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {valueGraph.map((step, index) => (
            <div key={step.id} className="rounded-md border border-border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
              <p className="mt-1 text-sm font-semibold">{step.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.helper}</p>
              <Link href={step.href} className="mt-3 inline-flex text-xs underline">
                Open source record
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Import Existing Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Select
                value={target}
                onChange={(event) => {
                  const nextTarget = event.target.value as typeof target;
                  setTarget(nextTarget);
                  setContent(getImportPlaceholder(nextTarget, source));
                }}
              >
                <option value="FINDINGS">Imported Findings</option>
                <option value="RISKS">Imported Risks</option>
                <option value="APPROVED_ANSWERS">Imported Approved Answers</option>
                <option value="INCIDENTS">Imported Incidents</option>
              </Select>
              <Select
                value={source}
                onChange={(event) => {
                  const nextSource = event.target.value as typeof source;
                  setSource(nextSource);
                  setContent(getImportPlaceholder(target, nextSource));
                }}
              >
                <option value="MANUAL">Manual Paste</option>
                <option value="CSV">CSV Paste</option>
                <option value="CONNECTOR_EXPORT">Connector Export Paste</option>
              </Select>
              <Select value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)}>
                <option value="">No default owner</option>
                {reviewers.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.label}
                  </option>
                ))}
              </Select>
              {source === 'CONNECTOR_EXPORT' ? (
                <Select value={connectorId} onChange={(event) => setConnectorId(event.target.value)}>
                  {connectors.length === 0 ? <option value="">No connector configured</option> : null}
                  {connectors.map((connector) => (
                    <option key={connector.id} value={connector.id}>
                      {connector.name} ({connector.provider})
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  Use manual or CSV paste when a direct connector import is not needed.
                </div>
              )}
            </div>

            {target === 'APPROVED_ANSWERS' ? (
              <Select
                value={approvedAnswerScope}
                onChange={(event) =>
                  setApprovedAnswerScope(event.target.value as 'REUSABLE' | 'TENANT_SPECIFIC')
                }
              >
                <option value="REUSABLE">Reusable answer scope</option>
                <option value="TENANT_SPECIFIC">Tenant-specific answer scope</option>
              </Select>
            ) : null}

            {target === 'INCIDENTS' ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Select
                  value={incidentType}
                  onChange={(event) =>
                    setIncidentType(
                      event.target.value as
                        | 'IDENTITY_COMPROMISE'
                        | 'RANSOMWARE'
                        | 'PHISHING'
                        | 'THIRD_PARTY_BREACH'
                        | 'CLOUD_EXPOSURE'
                        | 'LOST_DEVICE'
                        | 'AI_MISUSE'
                        | 'OTHER'
                    )
                  }
                >
                  {[
                    'IDENTITY_COMPROMISE',
                    'RANSOMWARE',
                    'PHISHING',
                    'THIRD_PARTY_BREACH',
                    'CLOUD_EXPOSURE',
                    'LOST_DEVICE',
                    'AI_MISUSE',
                    'OTHER'
                  ].map((value) => (
                    <option key={value} value={value}>
                      {value.replace(/_/g, ' ')}
                    </option>
                  ))}
                </Select>
                <Select
                  value={incidentSeverity}
                  onChange={(event) =>
                    setIncidentSeverity(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')
                  }
                >
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            <Textarea
              rows={8}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={currentPlaceholder}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {source === 'MANUAL'
                  ? 'Manual mode expects pipe-separated rows. CSV and connector-export modes expect comma-separated headers.'
                  : 'Connector export mode records which configured connector the pasted export came from without claiming unsupported direct API pull.'}
              </p>
              <Button onClick={submitImport} disabled={busy || !content.trim()}>
                {busy ? 'Importing...' : `Import ${formatTargetLabel(target)}`}
              </Button>
            </div>

            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connector-Aware Adoption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectors.length ? (
              connectors.map((connector) => (
                <div key={connector.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{connector.name}</p>
                      <p className="text-xs text-muted-foreground">{connector.provider.toLowerCase().replace(/_/g, ' ')}</p>
                    </div>
                    <StatusPill status={connector.status} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Use this connector for notifications, sync, publishing, or to label a connector-assisted import from an exported data set.
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No connectors are configured yet.</p>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href="/app/settings/connectors">Review Connector Health</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Adoption Imports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {imports.length ? (
            imports.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {formatTargetLabel(item.target)} from {formatTargetLabel(item.source)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                      {item.sourceLabel ? ` | ${item.sourceLabel}` : ''}
                      {item.connector?.name ? ` | ${item.connector.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={item.status} />
                    <span className="text-xs text-muted-foreground">
                      {item.createdCount} created / {item.failedCount} failed
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No adoption imports recorded yet. Start by importing findings, risks, approved answers, or incidents from the systems your team already uses.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
