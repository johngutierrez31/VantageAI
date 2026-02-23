'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

type Entitlements = {
  plan: string;
  status: string;
  limits: {
    maxTemplates: number;
    maxAssessmentsPerMonth: number;
    maxEvidenceItems: number;
    canUseAI: boolean;
    canExportPdf: boolean;
  };
};

export function BillingPanel() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [plan, setPlan] = useState<'STARTER' | 'PRO' | 'PARTNER'>('PRO');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch('/api/billing/subscription');
    if (!response.ok) return;
    const json = await response.json();
    setEntitlements(json.entitlements);
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

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">
        Plan: {entitlements?.plan ?? 'STARTER'} ({entitlements?.status ?? 'active'})
      </p>
      <p className="text-sm text-muted-foreground">
        AI: {entitlements?.limits?.canUseAI ? 'Enabled' : 'Disabled'} | PDF Export:{' '}
        {entitlements?.limits?.canExportPdf ? 'Enabled' : 'Disabled'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={plan} onChange={(event) => setPlan(event.target.value as 'STARTER' | 'PRO' | 'PARTNER')} className="w-[180px]">
          <option value="STARTER">Starter</option>
          <option value="PRO">Pro</option>
          <option value="PARTNER">Partner</option>
        </Select>
        <Button onClick={startCheckout} disabled={busy}>{busy ? 'Working...' : 'Upgrade / change plan'}</Button>
        <Button variant="outline" onClick={openPortal} disabled={busy}>Manage billing portal</Button>
      </div>
      {message ? <p className="text-sm text-danger">{message}</p> : null}
    </div>
  );
}
