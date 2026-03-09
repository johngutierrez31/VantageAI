'use client';

import { Fragment, useMemo, useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type AnalysisType =
  | 'incident_response'
  | 'threat_model'
  | 'vulnerability_assessment'
  | 'architecture_review'
  | 'compliance_gap';

type Framework = 'CIA Triad' | 'STRIDE' | 'MITRE ATT&CK' | 'Zero Trust' | 'NIST CSF';

type CopilotCitation = {
  evidenceId: string;
  evidenceName: string;
  chunkId: string;
  chunkIndex: number;
  snippet: string;
  score: number;
};

type AnalysisRun = {
  id: string;
  createdAt: string;
  analysisType: AnalysisType;
  systemName: string;
  scenario: string;
  answer: string;
  citations: CopilotCitation[];
};

const frameworkOptions: Framework[] = ['CIA Triad', 'STRIDE', 'MITRE ATT&CK', 'Zero Trust', 'NIST CSF'];

const analysisTypeMeta: Record<
  AnalysisType,
  { label: string; starter: string; expectedOutput: string; severityLens: string }
> = {
  incident_response: {
    label: 'Incident Response Triage',
    starter: 'Multiple failed admin login attempts followed by privileged role changes in production.',
    expectedOutput: 'Immediate containment, root-cause hypotheses, and 24-hour response sequence.',
    severityLens: 'Prioritize blast radius, active attacker capability, and containment speed.'
  },
  threat_model: {
    label: 'Threat Modeling',
    starter: 'New customer-facing API and admin console for tenant management.',
    expectedOutput: 'Threat scenarios, attack paths, controls, and prioritized mitigations.',
    severityLens: 'Prioritize exploitability and business-impacting abuse cases.'
  },
  vulnerability_assessment: {
    label: 'Vulnerability Assessment',
    starter: 'External app has stale dependencies and permissive network policies.',
    expectedOutput: 'Top findings, likelihood x impact rating, and remediation plan.',
    severityLens: 'Prioritize internet-facing flaws with known exploitation patterns.'
  },
  architecture_review: {
    label: 'Security Architecture Review',
    starter: 'Hybrid cloud setup with shared admin credentials and limited segmentation.',
    expectedOutput: 'Architecture weaknesses, control improvements, and staged hardening plan.',
    severityLens: 'Prioritize identity and segmentation weaknesses that enable lateral movement.'
  },
  compliance_gap: {
    label: 'Compliance Gap Analysis',
    starter: 'Need SOC 2 readiness for access control, logging, and incident response controls.',
    expectedOutput: 'Control gaps, evidence requirements, and an execution backlog.',
    severityLens: 'Prioritize controls with highest audit failure probability.'
  }
};

function renderAssistantContent(content: string) {
  const blocks = content
    .split(/\n{2,}/)
    .map((value) => value.trim())
    .filter(Boolean);

  return blocks.map((block, blockIndex) => {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return null;

    const allBullets = lines.every((line) => /^(\-|\*|\d+\.)\s+/.test(line));
    if (allBullets) {
      return (
        <ul key={`block-list-${blockIndex}`} className="mb-2 list-disc space-y-1 pl-5 text-sm">
          {lines.map((line, lineIndex) => (
            <li key={`line-${lineIndex}`}>{line.replace(/^(\-|\*|\d+\.)\s+/, '')}</li>
          ))}
        </ul>
      );
    }

    return (
      <Fragment key={`block-text-${blockIndex}`}>
        {lines.map((line, lineIndex) => {
          const isHeading = /:$/.test(line) || /^#{1,3}\s+/.test(line);
          const normalized = line.replace(/^#{1,3}\s+/, '');

          if (isHeading) {
            return (
              <p key={`line-${lineIndex}`} className="mb-1 text-sm font-semibold">
                {normalized.replace(/:$/, '')}
              </p>
            );
          }

          return (
            <p key={`line-${lineIndex}`} className="mb-2 text-sm">
              {normalized}
            </p>
          );
        })}
      </Fragment>
    );
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMarkdownReport(run: AnalysisRun) {
  const citationLines = run.citations.length
    ? run.citations
        .map(
          (citation, index) =>
            `[${index + 1}] ${citation.evidenceName} (chunk ${citation.chunkIndex}) - score ${citation.score.toFixed(3)}`
        )
        .join('\n')
    : 'No evidence citations returned.';

  return [
    `# Security Analyst Report - ${analysisTypeMeta[run.analysisType].label}`,
    '',
    `Generated: ${new Date(run.createdAt).toLocaleString()}`,
    `System: ${run.systemName}`,
    '',
    '## Scenario',
    run.scenario,
    '',
    '## Analysis',
    run.answer,
    '',
    '## Citations',
    citationLines
  ].join('\n');
}

function buildPrintableHtml(run: AnalysisRun) {
  const citations = run.citations.length
    ? run.citations
        .map(
          (citation, index) =>
            `<li>[${index + 1}] ${escapeHtml(citation.evidenceName)} (chunk ${citation.chunkIndex}) - score ${citation.score.toFixed(3)}</li>`
        )
        .join('')
    : '<li>No evidence citations returned.</li>';

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    `  <title>${escapeHtml(run.systemName)} - Security Analyst Report</title>`,
    '  <style>',
    '    body { font-family: Arial, sans-serif; margin: 2rem auto; max-width: 980px; line-height: 1.5; color: #111827; }',
    '    h1, h2 { color: #0f172a; }',
    '    .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 16px; background: #f9fafb; }',
    '    pre { white-space: pre-wrap; background: #ffffff; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; }',
    '  </style>',
    '</head>',
    '<body>',
    `  <h1>Security Analyst Report - ${escapeHtml(analysisTypeMeta[run.analysisType].label)}</h1>`,
    `  <div class="box"><strong>Generated:</strong> ${escapeHtml(new Date(run.createdAt).toLocaleString())}<br /><strong>System:</strong> ${escapeHtml(run.systemName)}</div>`,
    '  <h2>Scenario</h2>',
    `  <pre>${escapeHtml(run.scenario)}</pre>`,
    '  <h2>Analysis</h2>',
    `  <pre>${escapeHtml(run.answer)}</pre>`,
    '  <h2>Citations</h2>',
    `  <ul>${citations}</ul>`,
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
  }, 200);
  return true;
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

export function SecurityAnalystPanel({ tenantName }: { tenantName: string }) {
  const [analysisType, setAnalysisType] = useState<AnalysisType>('incident_response');
  const [systemName, setSystemName] = useState('Production Web Application');
  const [scenario, setScenario] = useState(analysisTypeMeta.incident_response.starter);
  const [observedSignals, setObservedSignals] = useState('');
  const [businessImpact, setBusinessImpact] = useState('Customer trust, production availability, and compliance posture.');
  const [constraints, setConstraints] = useState('Small security team, need phased actions over 30 days.');
  const [selectedFrameworks, setSelectedFrameworks] = useState<Framework[]>([
    'CIA Triad',
    'STRIDE',
    'MITRE ATT&CK'
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [runs, setRuns] = useState<AnalysisRun[]>([]);

  const frameworkSummary = useMemo(() => selectedFrameworks.join(', '), [selectedFrameworks]);

  function toggleFramework(framework: Framework) {
    setSelectedFrameworks((current) =>
      current.includes(framework) ? current.filter((item) => item !== framework) : [...current, framework]
    );
  }

  function applyStarter(type: AnalysisType) {
    setAnalysisType(type);
    setScenario(analysisTypeMeta[type].starter);
  }

  async function runAnalysis() {
    setError(null);
    setMessage(null);

    if (!systemName.trim() || !scenario.trim()) {
      setError('System name and scenario are required.');
      return;
    }

    if (selectedFrameworks.length === 0) {
      setError('Select at least one security framework.');
      return;
    }

    const typeMeta = analysisTypeMeta[analysisType];
    const prompt = [
      `Act as a cybersecurity analyst for tenant "${tenantName}".`,
      `Analysis type: ${typeMeta.label}`,
      `System / Scope: ${systemName.trim()}`,
      `Scenario: ${scenario.trim()}`,
      `Observed signals: ${observedSignals.trim() || 'None provided.'}`,
      `Business impact context: ${businessImpact.trim() || 'Not specified.'}`,
      `Operational constraints: ${constraints.trim() || 'Not specified.'}`,
      `Required frameworks: ${frameworkSummary}`,
      `Severity lens: ${typeMeta.severityLens}`,
      'Output format:',
      '1. Executive summary',
      '2. Threat hypotheses and likely attack paths',
      '3. Evidence-driven findings with explicit [1], [2] citations when relevant',
      '4. Containment and remediation plan (24h, 7d, 30d)',
      '5. Residual risk rating (Low/Medium/High) with rationale',
      '6. Decisions needed from leadership'
    ].join('\n\n');

    setBusy(true);
    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: runs.slice(0, 2).map((run) => ({ role: 'assistant' as const, content: run.answer }))
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            answer?: string;
            error?: string;
            citations?: CopilotCitation[];
          }
        | null;

      if (!response.ok || !payload?.answer) {
        setError(payload?.error ?? 'Security analysis failed.');
        return;
      }

      const run: AnalysisRun = {
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        analysisType,
        systemName: systemName.trim(),
        scenario: scenario.trim(),
        answer: payload.answer,
        citations: payload.citations ?? []
      };

      setRuns((current) => [run, ...current]);
      setMessage('Security analysis generated.');
    } catch {
      setError('Security analysis failed due to a network or server issue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Analyst"
        helpKey="securityAnalyst"
        description="Run structured security analysis using threat-model and incident-response workflows with evidence citations."
        primaryAction={{ label: busy ? 'Analyzing...' : 'Run Analysis', onClick: runAnalysis }}
        secondaryActions={[{ label: 'Open Copilot', href: '/app/copilot', variant: 'outline' }]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Analysis Input</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Select value={analysisType} onChange={(event) => setAnalysisType(event.target.value as AnalysisType)}>
            {Object.entries(analysisTypeMeta).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </Select>
          <Input value={systemName} onChange={(event) => setSystemName(event.target.value)} placeholder="System or service name" />
          <Textarea
            value={scenario}
            onChange={(event) => setScenario(event.target.value)}
            placeholder="Describe the scenario and what is happening."
            className="md:col-span-2"
          />
          <Textarea
            value={observedSignals}
            onChange={(event) => setObservedSignals(event.target.value)}
            placeholder="Observed signals (logs, alerts, suspicious behavior)"
          />
          <Textarea
            value={businessImpact}
            onChange={(event) => setBusinessImpact(event.target.value)}
            placeholder="Business impact context"
          />
          <Textarea
            value={constraints}
            onChange={(event) => setConstraints(event.target.value)}
            placeholder="Constraints (team size, deadlines, budget, tooling)"
            className="md:col-span-2"
          />
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium">Frameworks</p>
            <div className="flex flex-wrap gap-3">
              {frameworkOptions.map((framework) => (
                <label key={framework} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedFrameworks.includes(framework)}
                    onChange={() => toggleFramework(framework)}
                  />
                  {framework}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button onClick={runAnalysis} disabled={busy}>
              {busy ? 'Analyzing...' : 'Run Security Analysis'}
            </Button>
            {(Object.keys(analysisTypeMeta) as AnalysisType[]).map((type) => (
              <Button key={type} variant="outline" onClick={() => applyStarter(type)} type="button">
                Use {analysisTypeMeta[type].label} Starter
              </Button>
            ))}
          </div>
          <p className="md:col-span-2 text-xs text-muted-foreground">
            Expected output: {analysisTypeMeta[analysisType].expectedOutput}
          </p>
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Analysis Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No analysis runs yet. Submit a scenario to generate your first report.</p>
          ) : (
            runs.map((run) => (
              <div key={run.id} className="rounded-md border border-border bg-background/60 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{analysisTypeMeta[run.analysisType].label}</p>
                    <p className="text-xs text-muted-foreground">
                      {run.systemName} · {new Date(run.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(buildMarkdownReport(run))}
                    >
                      Copy Markdown
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadFile(
                          `security-analysis-${run.id}.md`,
                          'text/markdown; charset=utf-8',
                          buildMarkdownReport(run)
                        )
                      }
                    >
                      Download Markdown
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openPrintWindow(buildPrintableHtml(run))}>
                      Export PDF (Print)
                    </Button>
                  </div>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">Scenario: {run.scenario}</p>
                <div>{renderAssistantContent(run.answer)}</div>
                {run.citations.length ? (
                  <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Citations</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {run.citations.map((citation, index) => (
                        <li key={`${citation.chunkId}-${index}`}>
                          [{index + 1}] {citation.evidenceName} (chunk {citation.chunkIndex})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

