'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  MODULE_CATALOG,
  formatPlanLabel,
  getModuleCommercialState,
  type CommercialPlanTier
} from '@/lib/product/module-catalog';

type Entitlements = {
  plan: CommercialPlanTier;
  status: string;
  limits: {
    maxTemplates: number;
    maxAssessmentsPerMonth: number;
    maxEvidenceItems: number;
    canUseAI: boolean;
    canExportPdf: boolean;
  };
};

type Workspace = {
  workspaceMode: 'DEMO' | 'TRIAL' | 'PAID';
  trialStatus: 'NOT_STARTED' | 'ACTIVE' | 'EXPIRED' | 'CONVERTED';
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  isTrialActive: boolean;
};

export function BillingPanel() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [plan, setPlan] = useState<'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE'>('PRO');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch('/api/billing/subscription');
    if (!response.ok) return;
    const json = await response.json();
    setEntitlements(json.entitlements);
    setWorkspace(json.workspace);
  }

  useEffect(() => {
    void load();
  }, []);

  async function startCheckout() {
    setBusy(true);
    setMessage(null);

    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    });

    const json = await response.json();
    if (!response.ok) {
      setMessage(json.error ?? 'Unable to start checkout');
      setBusy(false);
      return;
    }

    window.location.href = json.url;
  }

  async function openPortal() {
    setBusy(true);
    setMessage(null);

    const response = await fetch('/api/billing/portal', { method: 'POST' });
    const json = await response.json();

    if (!response.ok) {
      setMessage(json.error ?? 'Unable to open billing portal');
      setBusy(false);
      return;
    }

    window.location.href = json.url;
  }

  const isDemoWorkspace = workspace?.workspaceMode === 'DEMO';
  const isTrialWorkspace = workspace?.isTrialActive;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">
        {isDemoWorkspace
          ? 'Demo-unlocked workspace'
          : isTrialWorkspace
          ? `14-day full-access trial (${workspace.trialDaysRemaining ?? 0} day${workspace?.trialDaysRemaining === 1 ? '' : 's'} remaining)`
          : `Plan: ${entitlements ? formatPlanLabel(entitlements.plan) : 'Free'} (${entitlements?.status ?? 'active'})`}
      </p>
      {isDemoWorkspace ? (
        <p className="text-sm text-muted-foreground">
          This demo workspace keeps premium modules, AI workflows, questionnaire imports, and PDF/HTML export paths enabled for evaluation.
          Billing checkout and packaging controls are hidden here so the product story stays internally consistent.
        </p>
      ) : isTrialWorkspace ? (
        <p className="text-sm text-muted-foreground">
          All suite modules, AI workflows, questionnaire imports, and export paths are available during the trial.
          {workspace.trialEndsAt ? ` Trial ends ${new Date(workspace.trialEndsAt).toLocaleDateString()}.` : ''}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          AI: {entitlements?.limits?.canUseAI ? 'Enabled' : 'Disabled'} | PDF Export:{' '}
          {entitlements?.limits?.canExportPdf ? 'Enabled' : 'Disabled'}
        </p>
      )}
      {entitlements ? (
        <div className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-2">
          {MODULE_CATALOG.map((module) => {
            const commercialState = getModuleCommercialState(entitlements.plan, module, {
              workspaceMode: workspace?.workspaceMode,
              isTrialActive: workspace?.isTrialActive
            });
            return (
              <div key={module.id} className="rounded-md border border-border bg-background/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{module.label}</p>
                  <span className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
                    {commercialState.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{module.premiumLabel}</p>
              </div>
            );
          })}
        </div>
      ) : null}
      {isDemoWorkspace || isTrialWorkspace ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={plan}
            onChange={(event) => setPlan(event.target.value as 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE')}
            className="w-[220px]"
          >
            <option value="STARTER">Starter</option>
            <option value="PRO">Pro</option>
            <option value="BUSINESS">Business</option>
            <option value="ENTERPRISE">Enterprise</option>
          </Select>
          <Button onClick={startCheckout} disabled={busy}>{busy ? 'Working...' : 'Upgrade / change plan'}</Button>
          <Button variant="outline" onClick={openPortal} disabled={busy}>Manage billing portal</Button>
        </div>
      )}
      {message ? <p className="text-sm text-danger">{message}</p> : null}
    </div>
  );
}

