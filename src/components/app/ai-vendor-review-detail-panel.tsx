'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type ReviewerOption = {
  id: string;
  label: string;
};

type PolicyOption = {
  id: string;
  label: string;
};

type VendorDetail = {
  id: string;
  vendorName: string;
  productName: string;
  primaryUseCase: string;
  modelProvider: string | null;
  deploymentType: string;
  authenticationSupport: string;
  loggingSupport: string;
  retentionPolicyStatus: string;
  trainsOnCustomerData: string;
  subprocessorsStatus: string;
  dpaStatus: string;
  securityDocsRequested: boolean;
  securityDocsReceived: boolean;
  dataClasses: string[];
  linkedPolicyIds: string[];
  matchedPolicyIds: string[];
  requiredConditions: string[];
  unmetRequirements: string[];
  approvalBlockers: string[];
  decisionConditions: string[];
  riskNotes: string | null;
  primaryRisks: string[];
  requiredControls: string[];
  ownerUserId: string | null;
  assignedReviewerUserId: string | null;
  reviewDueAt: string | null;
  reviewerNotes: string | null;
  riskTier: string;
  status: string;
  linkedFindingIds: string[];
  linkedRiskIds: string[];
  linkedTaskIds: string[];
  useCases: Array<{
    id: string;
    name: string;
    status: string;
    riskTier: string;
  }>;
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

function toDateTimeLocal(value: string | null) {
  return value ? value.slice(0, 16) : '';
}

export function AIVendorReviewDetailPanel({
  vendorReview,
  reviewers,
  policyOptions
}: {
  vendorReview: VendorDetail;
  reviewers: ReviewerOption[];
  policyOptions: PolicyOption[];
}) {
  const [form, setForm] = useState({
    vendorName: vendorReview.vendorName,
    productName: vendorReview.productName,
    primaryUseCase: vendorReview.primaryUseCase,
    modelProvider: vendorReview.modelProvider ?? '',
    deploymentType: vendorReview.deploymentType,
    authenticationSupport: vendorReview.authenticationSupport,
    loggingSupport: vendorReview.loggingSupport,
    retentionPolicyStatus: vendorReview.retentionPolicyStatus,
    trainsOnCustomerData: vendorReview.trainsOnCustomerData,
    subprocessorsStatus: vendorReview.subprocessorsStatus,
    dpaStatus: vendorReview.dpaStatus,
    securityDocsRequested: vendorReview.securityDocsRequested,
    securityDocsReceived: vendorReview.securityDocsReceived,
    riskNotes: vendorReview.riskNotes ?? '',
    ownerUserId: vendorReview.ownerUserId ?? '',
    assignedReviewerUserId: vendorReview.assignedReviewerUserId ?? '',
    reviewDueAt: toDateTimeLocal(vendorReview.reviewDueAt),
    reviewerNotes: vendorReview.reviewerNotes ?? '',
    status: vendorReview.status,
    dataClasses: vendorReview.dataClasses,
    linkedPolicyIds: vendorReview.linkedPolicyIds,
    decisionConditions: vendorReview.decisionConditions.join('\n')
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleListValue(key: 'dataClasses' | 'linkedPolicyIds', value: string) {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((entry) => entry !== value)
        : [...current[key], value]
    }));
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/ai-governance/vendors/${vendorReview.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        modelProvider: form.modelProvider || null,
        riskNotes: form.riskNotes || null,
        ownerUserId: form.ownerUserId || null,
        assignedReviewerUserId: form.assignedReviewerUserId || null,
        reviewDueAt: form.reviewDueAt ? new Date(form.reviewDueAt).toISOString() : null,
        reviewerNotes: form.reviewerNotes || null,
        decisionConditions: form.decisionConditions
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean)
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to update AI vendor review');
      return;
    }

    setMessage('AI vendor review updated. Refresh to load the recalculated governance state.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${vendorReview.vendorName} - ${vendorReview.productName}`}
        helpKey="aiVendorDetail"
        description="Review AI vendor controls, update intake status, and manage due dates, decision state, and Pulse-linked follow-up."
        secondaryActions={[
          { label: 'AI Governance', href: '/app/ai-governance', variant: 'outline' },
          { label: 'Vendor Intake', href: '/app/ai-governance/vendors', variant: 'outline' },
          { label: 'Review Queue', href: '/app/ai-governance/reviews', variant: 'outline' }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <div className="mt-2">
              <StatusPill status={vendorReview.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Risk Tier</p>
            <div className="mt-2">
              <StatusPill status={vendorReview.riskTier} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked Use Cases</p>
            <p className="text-2xl font-semibold">{vendorReview.useCases.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pulse Hooks</p>
            <p className="text-2xl font-semibold">
              {vendorReview.linkedRiskIds.length} / {vendorReview.linkedTaskIds.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Review Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input value={form.vendorName} onChange={(event) => setForm((current) => ({ ...current, vendorName: event.target.value }))} />
            <Input value={form.productName} onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))} />
            <Input value={form.modelProvider} onChange={(event) => setForm((current) => ({ ...current, modelProvider: event.target.value }))} />
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              {['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'ARCHIVED'].map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </Select>
          </div>
          <Textarea value={form.primaryUseCase} onChange={(event) => setForm((current) => ({ ...current, primaryUseCase: event.target.value }))} />
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
            <Input type="datetime-local" value={form.reviewDueAt} onChange={(event) => setForm((current) => ({ ...current, reviewDueAt: event.target.value }))} />
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
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Risk Notes</p>
            <Textarea value={form.riskNotes} onChange={(event) => setForm((current) => ({ ...current, riskNotes: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reviewer Notes</p>
            <Textarea value={form.reviewerNotes} onChange={(event) => setForm((current) => ({ ...current, reviewerNotes: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Decision Conditions</p>
            <Textarea value={form.decisionConditions} onChange={(event) => setForm((current) => ({ ...current, decisionConditions: event.target.value }))} />
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <div className="flex justify-end">
            <Button onClick={save} disabled={busy}>
              {busy ? 'Saving...' : 'Save Vendor Review'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Policy Mapping and Blockers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {vendorReview.matchedPolicyIds.map((policyId) => (
                <span key={policyId} className="rounded border border-border px-2 py-1 text-xs">
                  {policyId}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Required Conditions</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {vendorReview.requiredConditions.map((condition) => (
                  <li key={condition}>{formatLabel(condition)}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Unmet Requirements</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {vendorReview.unmetRequirements.map((condition) => (
                  <li key={condition}>{formatLabel(condition)}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Approval Blockers</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {vendorReview.approvalBlockers.map((condition) => (
                  <li key={condition}>{formatLabel(condition)}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Primary Risks</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {vendorReview.primaryRisks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Required Controls</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {vendorReview.requiredControls.map((control) => (
                  <li key={control}>{control}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked Use Cases</p>
              {vendorReview.useCases.length ? (
                vendorReview.useCases.map((useCase) => (
                  <div key={useCase.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{useCase.name}</p>
                      <div className="flex items-center gap-2">
                        <StatusPill status={useCase.riskTier} />
                        <StatusPill status={useCase.status} />
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link href={`/app/ai-governance/use-cases/${useCase.id}`}>Open Use Case</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No AI use cases are linked to this vendor review yet.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/app/findings">Open Findings</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/app/pulse/risks">Open Risk Register</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/app/ai-governance/reviews">Open Review Queue</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

