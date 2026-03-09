'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { DataTable } from '@/components/app/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const severityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const statusOptions = ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED', 'CLOSED'] as const;

type RiskItem = {
  id: string;
  title: string;
  description: string;
  businessImpactSummary: string;
  sourceModule: string;
  severity: string;
  likelihood: string;
  impact: string;
  status: string;
  ownerUserId: string | null;
  targetDueAt: string | null;
  reviewNotes: string | null;
  linkedControlIds: string[];
  updatedAt: string;
};

type ReviewerOption = {
  id: string;
  label: string;
};

async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return text ? JSON.parse(text) : null;
}

export function RiskRegisterPanel({
  risks,
  reviewers
}: {
  risks: RiskItem[];
  reviewers: ReviewerOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({
    title: '',
    description: '',
    businessImpactSummary: '',
    severity: 'HIGH',
    likelihood: 'MEDIUM',
    impact: 'HIGH',
    ownerUserId: '',
    targetDueAt: ''
  });
  const [drafts, setDrafts] = useState<Record<string, { status: string; severity: string; ownerUserId: string; targetDueAt: string }>>({});

  const filteredRisks = useMemo(() => {
    return risks.filter((risk) => {
      if (statusFilter !== 'ALL' && risk.status !== statusFilter) return false;
      if (severityFilter !== 'ALL' && risk.severity !== severityFilter) return false;
      if (sourceFilter !== 'ALL' && risk.sourceModule !== sourceFilter) return false;
      if (!search.trim()) return true;
      const needle = search.toLowerCase();
      return (
        risk.title.toLowerCase().includes(needle) ||
        risk.description.toLowerCase().includes(needle) ||
        risk.businessImpactSummary.toLowerCase().includes(needle)
      );
    });
  }, [risks, search, severityFilter, sourceFilter, statusFilter]);

  async function syncRisks() {
    setFormBusy(true);
    setError(null);
    try {
      await apiRequest('/api/pulse/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'sync' })
      });
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setFormBusy(false);
    }
  }

  async function createManualRisk() {
    setFormBusy(true);
    setError(null);
    try {
      await apiRequest('/api/pulse/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          ownerUserId: manualForm.ownerUserId || null,
          targetDueAt: manualForm.targetDueAt || null
        })
      });
      setManualForm({
        title: '',
        description: '',
        businessImpactSummary: '',
        severity: 'HIGH',
        likelihood: 'MEDIUM',
        impact: 'HIGH',
        ownerUserId: '',
        targetDueAt: ''
      });
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setFormBusy(false);
    }
  }

  async function saveRisk(risk: RiskItem) {
    const draft = drafts[risk.id] ?? {
      status: risk.status,
      severity: risk.severity,
      ownerUserId: risk.ownerUserId ?? '',
      targetDueAt: risk.targetDueAt ? risk.targetDueAt.slice(0, 10) : ''
    };

    setBusyId(risk.id);
    setError(null);
    try {
      await apiRequest(`/api/pulse/risks/${risk.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: draft.status,
          severity: draft.severity,
          ownerUserId: draft.ownerUserId || null,
          targetDueAt: draft.targetDueAt ? new Date(`${draft.targetDueAt}T00:00:00.000Z`).toISOString() : null
        })
      });
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Register"
        description="Maintain a living Pulse risk register sourced from findings, assessment gaps, overdue work, and manual leadership concerns."
        primaryAction={{ label: 'Open Pulse', href: '/app/pulse' }}
        secondaryActions={[{ label: 'Open Roadmap', href: '/app/pulse/roadmap', variant: 'outline' }]}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <DataTable
        title="Manual Risk Intake"
        description="Capture executive-facing risks that are not yet represented by findings or assessments."
        actions={
          <Button onClick={createManualRisk} disabled={formBusy}>
            {formBusy ? 'Saving...' : 'Create Manual Risk'}
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            value={manualForm.title}
            onChange={(event) => setManualForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Risk title"
          />
          <Select
            value={manualForm.severity}
            onChange={(event) => setManualForm((current) => ({ ...current, severity: event.target.value }))}
          >
            {severityOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
          <Select
            value={manualForm.likelihood}
            onChange={(event) => setManualForm((current) => ({ ...current, likelihood: event.target.value }))}
          >
            {severityOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
          <Select
            value={manualForm.impact}
            onChange={(event) => setManualForm((current) => ({ ...current, impact: event.target.value }))}
          >
            {severityOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
          <Input
            value={manualForm.description}
            onChange={(event) => setManualForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Risk description"
          />
          <Input
            value={manualForm.businessImpactSummary}
            onChange={(event) => setManualForm((current) => ({ ...current, businessImpactSummary: event.target.value }))}
            placeholder="Business impact summary"
          />
          <Select
            value={manualForm.ownerUserId}
            onChange={(event) => setManualForm((current) => ({ ...current, ownerUserId: event.target.value }))}
          >
            <option value="">Unassigned</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>{reviewer.label}</option>
            ))}
          </Select>
          <Input
            type="date"
            value={manualForm.targetDueAt}
            onChange={(event) => setManualForm((current) => ({ ...current, targetDueAt: event.target.value }))}
          />
        </div>
      </DataTable>

      <DataTable
        title="Register Operations"
        description="Sync auto-sourced risks from TrustOps, findings, assessment gaps, and overdue remediation work."
        actions={<Button onClick={syncRisks} disabled={formBusy}>{formBusy ? 'Syncing...' : 'Sync Auto Risks'}</Button>}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search risks" />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
          <Select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
            <option value="ALL">All severities</option>
            {severityOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
          <Select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="ALL">All sources</option>
            {Array.from(new Set(risks.map((risk) => risk.sourceModule))).sort().map((module) => (
              <option key={module} value={module}>{module}</option>
            ))}
          </Select>
        </div>
      </DataTable>

      <DataTable title="Risk Register" description="Prioritized living register of current business-relevant cyber risks.">
        <div className="space-y-3">
          {filteredRisks.length ? filteredRisks.map((risk) => {
            const draft = drafts[risk.id] ?? {
              status: risk.status,
              severity: risk.severity,
              ownerUserId: risk.ownerUserId ?? '',
              targetDueAt: risk.targetDueAt ? risk.targetDueAt.slice(0, 10) : ''
            };

            return (
              <div key={risk.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{risk.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {risk.sourceModule} | Updated {new Date(risk.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={risk.severity} />
                    <StatusPill status={risk.status} />
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{risk.description}</p>
                <p className="mt-2 text-sm">Business impact: {risk.businessImpactSummary}</p>
                {risk.linkedControlIds.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">Controls: {risk.linkedControlIds.join(', ')}</p>
                ) : null}
                <div className="mt-3 grid gap-2 md:grid-cols-[170px_170px_220px_150px_auto]">
                  <Select
                    value={draft.status}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [risk.id]: {
                          ...draft,
                          status: event.target.value
                        }
                      }))
                    }
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </Select>
                  <Select
                    value={draft.severity}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [risk.id]: {
                          ...draft,
                          severity: event.target.value
                        }
                      }))
                    }
                  >
                    {severityOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </Select>
                  <Select
                    value={draft.ownerUserId}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [risk.id]: {
                          ...draft,
                          ownerUserId: event.target.value
                        }
                      }))
                    }
                  >
                    <option value="">Unassigned</option>
                    {reviewers.map((reviewer) => (
                      <option key={reviewer.id} value={reviewer.id}>{reviewer.label}</option>
                    ))}
                  </Select>
                  <Input
                    type="date"
                    value={draft.targetDueAt}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [risk.id]: {
                          ...draft,
                          targetDueAt: event.target.value
                        }
                      }))
                    }
                  />
                  <div className="flex justify-end">
                    <Button onClick={() => saveRisk(risk)} disabled={busyId === risk.id}>
                      {busyId === risk.id ? 'Saving...' : 'Save Risk'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          }) : <p className="text-sm text-muted-foreground">No risks match the current filters.</p>}
        </div>
      </DataTable>
    </div>
  );
}
