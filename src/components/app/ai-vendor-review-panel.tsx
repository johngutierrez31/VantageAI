'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ReviewerOption = {
  id: string;
  label: string;
};

type PolicyOption = {
  id: string;
  label: string;
};

type VendorReviewRow = {
  id: string;
  vendorName: string;
  productName: string;
  primaryUseCase: string;
  modelProvider: string | null;
  deploymentType: string;
  riskNotes: string | null;
  dataClasses: string[];
  riskTier: string;
  status: string;
  ownerUserId: string | null;
  assignedReviewerUserId: string | null;
  reviewDueAt: string | null;
  matchedPolicyIds: string[];
  approvalBlockers: string[];
  linkedFindingIds: string[];
  linkedRiskIds: string[];
  linkedTaskIds: string[];
};

const deploymentTypes = ['SAAS', 'INTERNAL', 'HYBRID', 'API', 'LOCAL_MODEL', 'OTHER'] as const;
const yesNoUnknownOptions = ['YES', 'NO', 'UNKNOWN'] as const;
const retentionOptions = ['KNOWN', 'UNKNOWN', 'NO_RETENTION'] as const;
const dpaOptions = ['NOT_STARTED', 'REQUESTED', 'RECEIVED', 'SIGNED', 'NOT_REQUIRED'] as const;
const dataClassOptions = [
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'CUSTOMER_DATA',
  'CUSTOMER_CONTENT',
  'CUSTOMER_METADATA',
  'PII',
  'PHI',
  'PCI',
  'FINANCIAL',
  'SOURCE_CODE',
  'SECRETS',
  'SECURITY_LOGS',
  'HR'
] as const;

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function AIVendorReviewPanel({
  activeWorkflow,
  vendorReviews,
  reviewers,
  policyOptions
}: {
  activeWorkflow: 'create' | null;
  vendorReviews: VendorReviewRow[];
  reviewers: ReviewerOption[];
  policyOptions: PolicyOption[];
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    vendorName: '',
    productName: '',
    primaryUseCase: '',
    modelProvider: '',
    deploymentType: 'SAAS',
    authenticationSupport: 'UNKNOWN',
    loggingSupport: 'UNKNOWN',
    retentionPolicyStatus: 'UNKNOWN',
    trainsOnCustomerData: 'UNKNOWN',
    subprocessorsStatus: 'UNKNOWN',
    dpaStatus: 'NOT_STARTED',
    securityDocsRequested: false,
    securityDocsReceived: false,
    riskNotes: '',
    ownerUserId: '',
    assignedReviewerUserId: '',
    reviewDueAt: '',
    dataClasses: [] as string[],
    linkedPolicyIds: [] as string[]
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return vendorReviews.filter((review) => {
      if (statusFilter !== 'ALL' && review.status !== statusFilter) return false;
      if (riskFilter !== 'ALL' && review.riskTier !== riskFilter) return false;
      if (!needle) return true;
      return [review.vendorName, review.productName, review.primaryUseCase, review.modelProvider ?? '', review.riskNotes ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [riskFilter, search, statusFilter, vendorReviews]);

  function toggleListValue(key: 'dataClasses' | 'linkedPolicyIds', value: string) {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((entry) => entry !== value)
        : [...current[key], value]
    }));
  }

  async function submit() {
    setBusy(true);
    setMessage(null);
    const response = await fetch('/api/ai-governance/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        modelProvider: form.modelProvider || undefined,
        riskNotes: form.riskNotes || undefined,
        ownerUserId: form.ownerUserId || null,
        assignedReviewerUserId: form.assignedReviewerUserId || null,
        reviewDueAt: form.reviewDueAt ? new Date(form.reviewDueAt).toISOString() : null
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to create AI vendor review');
      return;
    }

    setForm({
      vendorName: '',
      productName: '',
      primaryUseCase: '',
      modelProvider: '',
      deploymentType: 'SAAS',
      authenticationSupport: 'UNKNOWN',
      loggingSupport: 'UNKNOWN',
      retentionPolicyStatus: 'UNKNOWN',
      trainsOnCustomerData: 'UNKNOWN',
      subprocessorsStatus: 'UNKNOWN',
      dpaStatus: 'NOT_STARTED',
      securityDocsRequested: false,
      securityDocsReceived: false,
      riskNotes: '',
      ownerUserId: '',
      assignedReviewerUserId: '',
      reviewDueAt: '',
      dataClasses: [],
      linkedPolicyIds: []
    });
    setMessage('AI vendor intake created. Refresh to load the new review record.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Vendor Intake"
        helpKey="aiVendors"
        description="Review AI vendors and products for retention, training behavior, logging, DPA status, and approval conditions."
        secondaryActions={[
          { label: 'AI Governance', href: '/app/ai-governance', variant: 'outline' },
          { label: 'Review Queue', href: '/app/ai-governance/reviews', variant: 'outline' },
          { label: 'Use Cases', href: '/app/ai-governance/use-cases', variant: 'outline' }
        ]}
      />

      {activeWorkflow ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="space-y-2 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Workflow Mode</p>
            <p className="text-lg font-semibold">Start AI Vendor Intake</p>
            <p className="text-sm text-muted-foreground">
              Capture deployment type, data classes, retention posture, DPA state, and reviewer assignment in one intake so downstream conditions and Pulse hooks stay attached to the vendor decision record.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card
        id="ai-vendor-intake-form"
        className={cn(activeWorkflow ? 'border-primary/50 bg-primary/5 shadow-sm' : null)}
      >
        <CardHeader>
          <CardTitle>Start Vendor Intake</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input placeholder="Vendor name" value={form.vendorName} onChange={(event) => setForm((current) => ({ ...current, vendorName: event.target.value }))} />
            <Input placeholder="Product name" value={form.productName} onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))} />
            <Input placeholder="Model provider (optional)" value={form.modelProvider} onChange={(event) => setForm((current) => ({ ...current, modelProvider: event.target.value }))} />
            <Input type="datetime-local" value={form.reviewDueAt} onChange={(event) => setForm((current) => ({ ...current, reviewDueAt: event.target.value }))} />
          </div>
          <Textarea placeholder="Describe the primary AI use case for this vendor or product." value={form.primaryUseCase} onChange={(event) => setForm((current) => ({ ...current, primaryUseCase: event.target.value }))} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Select value={form.deploymentType} onChange={(event) => setForm((current) => ({ ...current, deploymentType: event.target.value }))}>
              {deploymentTypes.map((option) => (
                <option key={option} value={option}>
                  {formatLabel(option)}
                </option>
              ))}
            </Select>
            <Select value={form.ownerUserId} onChange={(event) => setForm((current) => ({ ...current, ownerUserId: event.target.value }))}>
              <option value="">No owner assigned</option>
              {reviewers.map((reviewer) => (
                <option key={reviewer.id} value={reviewer.id}>
                  {reviewer.label}
                </option>
              ))}
            </Select>
            <Select value={form.assignedReviewerUserId} onChange={(event) => setForm((current) => ({ ...current, assignedReviewerUserId: event.target.value }))}>
              <option value="">No reviewer assigned</option>
              {reviewers.map((reviewer) => (
                <option key={reviewer.id} value={reviewer.id}>
                  {reviewer.label}
                </option>
              ))}
            </Select>
            <Select value={form.dpaStatus} onChange={(event) => setForm((current) => ({ ...current, dpaStatus: event.target.value }))}>
              {dpaOptions.map((option) => (
                <option key={option} value={option}>
                  {formatLabel(option)}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              ['authenticationSupport', 'Authentication / SSO'],
              ['loggingSupport', 'Logging support'],
              ['trainsOnCustomerData', 'Trains on customer data'],
              ['subprocessorsStatus', 'Subprocessors known']
            ].map(([key, label]) => (
              <div key={key} className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <Select value={form[key as keyof typeof form] as string} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}>
                  {yesNoUnknownOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatLabel(option)}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Retention policy</p>
              <Select value={form.retentionPolicyStatus} onChange={(event) => setForm((current) => ({ ...current, retentionPolicyStatus: event.target.value }))}>
                {retentionOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.securityDocsRequested}
                onChange={(event) => setForm((current) => ({ ...current, securityDocsRequested: event.target.checked }))}
              />
              Security documents requested
            </label>
            <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.securityDocsReceived}
                onChange={(event) => setForm((current) => ({ ...current, securityDocsReceived: event.target.checked }))}
              />
              Security documents received
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Data Classes</p>
            <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
              {dataClassOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.dataClasses.includes(option)}
                    onChange={() => toggleListValue('dataClasses', option)}
                  />
                  {formatLabel(option)}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked Policy Templates</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {policyOptions.map((policy) => (
                <label key={policy.id} className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.linkedPolicyIds.includes(policy.id)}
                    onChange={() => toggleListValue('linkedPolicyIds', policy.id)}
                  />
                  <span>{policy.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Textarea placeholder="Risk notes, exceptions, or follow-up requirements." value={form.riskNotes} onChange={(event) => setForm((current) => ({ ...current, riskNotes: event.target.value }))} />
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <div className="flex justify-end">
            <Button onClick={submit} disabled={busy || form.dataClasses.length === 0}>
              {busy ? 'Creating...' : 'Create Vendor Intake'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="ai-vendor-reviews">
        <CardHeader>
          <CardTitle>Vendor Intake Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <Input placeholder="Search vendors or products" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            {['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'ARCHIVED'].map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </Select>
          <Select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
            <option value="ALL">All risk tiers</option>
            {['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].map((tier) => (
              <option key={tier} value={tier}>
                {formatLabel(tier)}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No AI vendor intakes match the current filters.</CardContent>
          </Card>
        ) : (
          filtered.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">
                      {review.vendorName} - {review.productName}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{review.primaryUseCase}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={review.riskTier} />
                    <StatusPill status={review.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Deployment</p>
                    <p className="text-sm font-medium">{formatLabel(review.deploymentType)}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Matched Policies</p>
                    <p className="text-sm font-medium">{review.matchedPolicyIds.length}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Approval Blockers</p>
                    <p className="text-sm font-medium">{review.approvalBlockers.length}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Pulse Hooks</p>
                    <p className="text-sm font-medium">
                      {review.linkedFindingIds.length} finding(s) | {review.linkedRiskIds.length} risk(s)
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Data classes: {review.dataClasses.length}</span>
                  <span>Reviewer due: {review.reviewDueAt ? new Date(review.reviewDueAt).toLocaleString() : 'Not scheduled'}</span>
                  <span>Model provider: {review.modelProvider ?? 'Not recorded'}</span>
                  <span>Tasks: {review.linkedTaskIds.length}</span>
                </div>
                {review.riskNotes ? <p className="text-sm text-muted-foreground">{review.riskNotes}</p> : null}
                <div className="flex justify-end">
                  <Button asChild variant="outline">
                    <Link href={`/app/ai-governance/vendors/${review.id}`}>Open Vendor Review</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

