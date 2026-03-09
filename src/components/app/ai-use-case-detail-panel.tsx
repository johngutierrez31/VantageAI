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

type VendorOption = {
  id: string;
  label: string;
};

type PolicyOption = {
  id: string;
  label: string;
};

type UseCaseDetail = {
  id: string;
  name: string;
  description: string;
  businessOwner: string;
  department: string | null;
  useCaseType: string;
  workflowType: string;
  vendorName: string | null;
  vendorReviewId: string | null;
  modelFamily: string | null;
  deploymentContext: string;
  dataClasses: string[];
  customerDataInvolved: string;
  regulatedDataInvolved: string;
  secretsInvolved: string;
  externalToolAccess: string;
  internetAccess: string;
  humanReviewRequired: boolean;
  riskTier: string;
  status: string;
  linkedPolicyIds: string[];
  matchedPolicyIds: string[];
  requiredConditions: string[];
  unmetRequirements: string[];
  approvalBlockers: string[];
  decisionConditions: string[];
  primaryRisks: string[];
  requiredControls: string[];
  assignedReviewerUserId: string | null;
  reviewDueAt: string | null;
  reviewerNotes: string | null;
  linkedFindingIds: string[];
  linkedRiskIds: string[];
  linkedTaskIds: string[];
  vendorReview?: {
    id: string;
    vendorName: string;
    productName: string;
    status: string;
    riskTier: string;
  } | null;
};

const useCaseTypes = [
  'INTERNAL_PRODUCTIVITY',
  'CUSTOMER_FACING',
  'SECURITY_WORKFLOW',
  'ENGINEERING_WORKFLOW',
  'CONTENT_WORKFLOW',
  'ANALYTICS_WORKFLOW',
  'OTHER'
] as const;
const workflowTypes = [
  'ASSISTANT',
  'CHATBOT',
  'AUTOMATION',
  'AGENT',
  'RAG',
  'ANALYTICS',
  'CONTENT_GENERATION',
  'OTHER'
] as const;
const deploymentContexts = ['SAAS', 'INTERNAL', 'HYBRID', 'API', 'LOCAL_MODEL', 'OTHER'] as const;
const yesNoUnknownOptions = ['YES', 'NO', 'UNKNOWN'] as const;
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

export function AIUseCaseDetailPanel({
  useCase,
  reviewers,
  vendorOptions,
  policyOptions
}: {
  useCase: UseCaseDetail;
  reviewers: ReviewerOption[];
  vendorOptions: VendorOption[];
  policyOptions: PolicyOption[];
}) {
  const [form, setForm] = useState({
    name: useCase.name,
    description: useCase.description,
    businessOwner: useCase.businessOwner,
    department: useCase.department ?? '',
    useCaseType: useCase.useCaseType,
    workflowType: useCase.workflowType,
    vendorName: useCase.vendorName ?? '',
    vendorReviewId: useCase.vendorReviewId ?? '',
    modelFamily: useCase.modelFamily ?? '',
    deploymentContext: useCase.deploymentContext,
    customerDataInvolved: useCase.customerDataInvolved,
    regulatedDataInvolved: useCase.regulatedDataInvolved,
    secretsInvolved: useCase.secretsInvolved,
    externalToolAccess: useCase.externalToolAccess,
    internetAccess: useCase.internetAccess,
    humanReviewRequired: useCase.humanReviewRequired,
    assignedReviewerUserId: useCase.assignedReviewerUserId ?? '',
    reviewDueAt: toDateTimeLocal(useCase.reviewDueAt),
    reviewerNotes: useCase.reviewerNotes ?? '',
    status: useCase.status,
    dataClasses: useCase.dataClasses,
    linkedPolicyIds: useCase.linkedPolicyIds,
    decisionConditions: useCase.decisionConditions.join('\n')
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
    const response = await fetch(`/api/ai-governance/use-cases/${useCase.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        department: form.department || null,
        vendorName: form.vendorName || null,
        vendorReviewId: form.vendorReviewId || null,
        modelFamily: form.modelFamily || null,
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
      setMessage(payload.error ?? 'Failed to update AI use case');
      return;
    }

    setMessage('AI use case updated. Refresh to see the recalculated governance state.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={useCase.name}
        helpKey="aiUseCaseDetail"
        description="Review AI workflow details, update policy mapping inputs, and control assignment, due dates, and approval state."
        secondaryActions={[
          { label: 'AI Governance', href: '/app/ai-governance', variant: 'outline' },
          { label: 'Use Case Registry', href: '/app/ai-governance/use-cases', variant: 'outline' },
          { label: 'Review Queue', href: '/app/ai-governance/reviews', variant: 'outline' }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <div className="mt-2">
              <StatusPill status={useCase.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Risk Tier</p>
            <div className="mt-2">
              <StatusPill status={useCase.riskTier} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked Findings</p>
            <p className="text-2xl font-semibold">{useCase.linkedFindingIds.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked Risks / Tasks</p>
            <p className="text-2xl font-semibold">
              {useCase.linkedRiskIds.length} / {useCase.linkedTaskIds.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registry Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Input value={form.businessOwner} onChange={(event) => setForm((current) => ({ ...current, businessOwner: event.target.value }))} />
            <Input value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} />
            <Input value={form.modelFamily} onChange={(event) => setForm((current) => ({ ...current, modelFamily: event.target.value }))} />
          </div>
          <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Select value={form.useCaseType} onChange={(event) => setForm((current) => ({ ...current, useCaseType: event.target.value }))}>
              {useCaseTypes.map((option) => (
                <option key={option} value={option}>
                  {formatLabel(option)}
                </option>
              ))}
            </Select>
            <Select value={form.workflowType} onChange={(event) => setForm((current) => ({ ...current, workflowType: event.target.value }))}>
              {workflowTypes.map((option) => (
                <option key={option} value={option}>
                  {formatLabel(option)}
                </option>
              ))}
            </Select>
            <Select value={form.deploymentContext} onChange={(event) => setForm((current) => ({ ...current, deploymentContext: event.target.value }))}>
              {deploymentContexts.map((option) => (
                <option key={option} value={option}>
                  {formatLabel(option)}
                </option>
              ))}
            </Select>
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              {['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'ARCHIVED'].map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input value={form.vendorName} onChange={(event) => setForm((current) => ({ ...current, vendorName: event.target.value }))} placeholder="Vendor name" />
            <Select value={form.vendorReviewId} onChange={(event) => setForm((current) => ({ ...current, vendorReviewId: event.target.value }))}>
              <option value="">No linked vendor intake</option>
              {vendorOptions.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.label}
                </option>
              ))}
            </Select>
            <Select value={form.assignedReviewerUserId} onChange={(event) => setForm((current) => ({ ...current, assignedReviewerUserId: event.target.value }))}>
              <option value="">Unassigned reviewer</option>
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
              ['customerDataInvolved', 'Customer data'],
              ['regulatedDataInvolved', 'Regulated data'],
              ['secretsInvolved', 'Secrets'],
              ['externalToolAccess', 'External tools'],
              ['internetAccess', 'Internet access']
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
          </div>
          <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.humanReviewRequired}
              onChange={(event) => setForm((current) => ({ ...current, humanReviewRequired: event.target.checked }))}
            />
            Human review required
          </label>
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
              {busy ? 'Saving...' : 'Save Use Case'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current Policy Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {useCase.matchedPolicyIds.map((policyId) => (
                <span key={policyId} className="rounded border border-border px-2 py-1 text-xs">
                  {policyId}
                </span>
              ))}
              {useCase.matchedPolicyIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No policy templates were matched yet.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Required Conditions</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {useCase.requiredConditions.map((condition) => (
                  <li key={condition}>{formatLabel(condition)}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Unmet Requirements</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {useCase.unmetRequirements.map((condition) => (
                  <li key={condition}>{formatLabel(condition)}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Approval Blockers</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {useCase.approvalBlockers.map((condition) => (
                  <li key={condition}>{formatLabel(condition)}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Downstream Governance Impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Primary Risks</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {useCase.primaryRisks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Required Controls</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {useCase.requiredControls.map((control) => (
                  <li key={control}>{control}</li>
                ))}
              </ul>
            </div>
            {useCase.vendorReview ? (
              <div className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold">
                  Linked vendor review: {useCase.vendorReview.vendorName} - {useCase.vendorReview.productName}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusPill status={useCase.vendorReview.riskTier} />
                  <StatusPill status={useCase.vendorReview.status} />
                </div>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href={`/app/ai-governance/vendors/${useCase.vendorReview.id}`}>Open Vendor Review</Link>
                </Button>
              </div>
            ) : null}
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

