'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CyberRangePlan } from '@/lib/cyber-range/generate';

type Environment = 'on_premise' | 'cloud' | 'hybrid';
type Scale = 'small' | 'medium' | 'large';
type Fidelity = 'medium' | 'high' | 'ultra';

function splitTags(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function toLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (part) => part.toUpperCase());
}

function downloadFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrintablePlanHtml(plan: CyberRangePlan) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    `  <title>${escapeHtml(plan.input.rangeName)}</title>`,
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <style>',
    '    body { font-family: Arial, sans-serif; margin: 2rem auto; max-width: 980px; line-height: 1.45; color: #111827; }',
    '    h1,h2,h3 { color: #0f172a; }',
    '    .meta { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 0.5rem; }',
    '    pre { white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; }',
    '  </style>',
    '</head>',
    '<body>',
    `  <h1>${escapeHtml(plan.input.rangeName)}</h1>`,
    '  <div class="meta">',
    `    <p><strong>Plan ID:</strong> ${escapeHtml(plan.planId)}</p>`,
    `    <p><strong>Generated:</strong> ${escapeHtml(new Date(plan.generatedAt).toLocaleString())}</p>`,
    `    <p><strong>Organization:</strong> ${escapeHtml(plan.input.organizationName)}</p>`,
    `    <p><strong>Environment:</strong> ${escapeHtml(toLabel(plan.input.environment))}</p>`,
    `    <p><strong>Fidelity:</strong> ${escapeHtml(plan.input.fidelity.toUpperCase())}</p>`,
    '  </div>',
    '  <h2>Range Plan</h2>',
    `  <pre>${escapeHtml(plan.markdown)}</pre>`,
    '</body>',
    '</html>'
  ].join('\n');
}

function openPrintWindow(htmlContent: string) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 150);
  return true;
}

export function CyberRangePanel() {
  const [rangeName, setRangeName] = useState('Quarterly Security Defense Range');
  const [organizationName, setOrganizationName] = useState('VantageCISO');
  const [primaryUseCase, setPrimaryUseCase] = useState(
    'Run red-vs-blue incident response exercises to improve detection and containment speed.'
  );
  const [environment, setEnvironment] = useState<Environment>('hybrid');
  const [scale, setScale] = useState<Scale>('medium');
  const [fidelity, setFidelity] = useState<Fidelity>('high');
  const [durationDays, setDurationDays] = useState('3');
  const [participants, setParticipants] = useState('40');
  const [includeIdentityZone, setIncludeIdentityZone] = useState(true);
  const [includeOtZone, setIncludeOtZone] = useState(false);
  const [includeNpcTraffic, setIncludeNpcTraffic] = useState(true);
  const [complianceTags, setComplianceTags] = useState('SOC 2, ISO 27001');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<CyberRangePlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const planSummary = useMemo(() => {
    if (!plan) return null;
    return `${plan.zones.length} zones | ${plan.phases.length} phases | ${plan.capacity.vmTarget} VMs`;
  }, [plan]);

  async function generatePlan() {
    setBusy(true);
    setError(null);
    setMessage(null);

    const response = await fetch('/api/cyber-range/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rangeName,
        organizationName,
        primaryUseCase,
        environment,
        scale,
        fidelity,
        durationDays,
        participants,
        includeIdentityZone,
        includeOtZone,
        includeNpcTraffic,
        complianceTags: splitTags(complianceTags)
      })
    });

    const payload = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(payload.error ?? 'Failed to generate cyber range plan.');
      return;
    }

    setPlan(payload.plan as CyberRangePlan);
    setMessage('Cyber range plan generated.');
  }

  async function copyMarkdown() {
    if (!plan) return;
    await navigator.clipboard.writeText(plan.markdown);
    setMessage('Plan markdown copied to clipboard.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cyber Range Designer"
        description="Design and operationalize a high-fidelity training range with phased delivery, zone architecture, and reset strategy."
        primaryAction={{ label: busy ? 'Generating...' : 'Generate Plan', onClick: generatePlan }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Scenario Input</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input value={rangeName} onChange={(event) => setRangeName(event.target.value)} placeholder="Range name" />
          <Input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="Organization name"
          />
          <Select value={environment} onChange={(event) => setEnvironment(event.target.value as Environment)}>
            <option value="on_premise">On Premise</option>
            <option value="cloud">Cloud</option>
            <option value="hybrid">Hybrid</option>
          </Select>
          <Select value={scale} onChange={(event) => setScale(event.target.value as Scale)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </Select>
          <Select value={fidelity} onChange={(event) => setFidelity(event.target.value as Fidelity)}>
            <option value="medium">Medium Fidelity</option>
            <option value="high">High Fidelity</option>
            <option value="ultra">Ultra Fidelity</option>
          </Select>
          <Input
            value={durationDays}
            onChange={(event) => setDurationDays(event.target.value)}
            type="number"
            min={1}
            max={14}
            placeholder="Duration (days)"
          />
          <Input
            value={participants}
            onChange={(event) => setParticipants(event.target.value)}
            type="number"
            min={2}
            max={1000}
            placeholder="Participants"
          />
          <Input
            value={complianceTags}
            onChange={(event) => setComplianceTags(event.target.value)}
            placeholder="Compliance tags (comma-separated)"
          />
          <Textarea
            value={primaryUseCase}
            onChange={(event) => setPrimaryUseCase(event.target.value)}
            placeholder="Primary exercise use case"
            className="md:col-span-2"
          />
          <div className="md:col-span-2 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeIdentityZone}
                onChange={(event) => setIncludeIdentityZone(event.target.checked)}
              />
              Include Identity Zone
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeOtZone} onChange={(event) => setIncludeOtZone(event.target.checked)} />
              Include OT/ICS Zone
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeNpcTraffic}
                onChange={(event) => setIncludeNpcTraffic(event.target.checked)}
              />
              Include NPC Traffic
            </label>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <Button onClick={generatePlan} disabled={busy}>
              {busy ? 'Generating...' : 'Generate Cyber Range Plan'}
            </Button>
            {plan ? (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadFile(`${plan.planId}.md`, 'text/markdown; charset=utf-8', plan.markdown)
                  }
                >
                  Download Markdown
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadFile(
                      `${plan.planId}.json`,
                      'application/json; charset=utf-8',
                      JSON.stringify(plan, null, 2)
                    )
                  }
                >
                  Download JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadFile(
                      `${plan.planId}.html`,
                      'text/html; charset=utf-8',
                      buildPrintablePlanHtml(plan)
                    )
                  }
                >
                  Download HTML
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const opened = openPrintWindow(buildPrintablePlanHtml(plan));
                    if (!opened) {
                      setError('Popup blocked. Allow popups for this site and try again.');
                      return;
                    }
                    setMessage('Print dialog opened. Choose "Save as PDF".');
                  }}
                >
                  Save PDF
                </Button>
                <Button variant="ghost" onClick={copyMarkdown}>
                  Copy Markdown
                </Button>
              </>
            ) : null}
          </div>
          {error ? <p className="md:col-span-2 text-sm text-danger">{error}</p> : null}
          {message ? <p className="md:col-span-2 text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!plan ? (
            <p className="text-sm text-muted-foreground">Generate a plan to see architecture, phases, and runbook outputs.</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Plan ID</p>
                  <p className="mt-1 text-sm">{plan.planId}</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Generated</p>
                  <p className="mt-1 text-sm">{new Date(plan.generatedAt).toLocaleString()}</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Summary</p>
                  <p className="mt-1 text-sm">{planSummary}</p>
                </div>
              </div>

              <div className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold">Zones</p>
                <div className="mt-2 space-y-2">
                  {plan.zones.map((zone) => (
                    <div key={zone.name} className="rounded-md border border-border bg-background/50 p-3">
                      <p className="text-sm font-semibold">{zone.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {toLabel(zone.trustLevel)} | {zone.purpose}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{zone.components.join(' | ')}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold">Implementation Phases</p>
                <div className="mt-2 space-y-2">
                  {plan.phases.map((phase) => (
                    <div key={phase.order} className="rounded-md border border-border bg-background/50 p-3">
                      <p className="text-sm font-semibold">
                        Phase {phase.order}: {phase.title}
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                        {phase.deliverables.map((deliverable) => (
                          <li key={deliverable}>{deliverable}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
