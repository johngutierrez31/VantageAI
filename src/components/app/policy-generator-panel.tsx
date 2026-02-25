'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type PolicyTemplateItem = {
  id: string;
  title: string;
  source: string;
  category: string;
  type: string;
  frameworks: string[];
  tags: string[];
  wordCount: number;
};

type FormatType = 'markdown' | 'html' | 'json';

type GeneratedDocument = {
  policyId: string;
  title: string;
  format: FormatType;
  fileName: string;
  mimeType: string;
  content: string;
};

const reviewSchedules = ['Quarterly', 'Semi-annually', 'Annually', 'Bi-annually'] as const;

const foundationalMatchers = [
  'information security policy',
  'acceptable use',
  'password',
  'data classification',
  'data recovery'
];

const comprehensiveMatchers = [
  ...foundationalMatchers,
  'access',
  'incident response',
  'remote access',
  'security awareness',
  'vulnerability'
];

function splitList(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function pickByMatchers(templates: PolicyTemplateItem[], matchers: string[], limit: number) {
  const pickedIds: string[] = [];

  for (const matcher of matchers) {
    const candidate = templates.find((template) => {
      if (pickedIds.includes(template.id)) return false;
      return template.title.toLowerCase().includes(matcher);
    });
    if (candidate) pickedIds.push(candidate.id);
    if (pickedIds.length >= limit) break;
  }

  if (pickedIds.length < limit) {
    for (const template of templates) {
      if (pickedIds.includes(template.id)) continue;
      pickedIds.push(template.id);
      if (pickedIds.length >= limit) break;
    }
  }

  return pickedIds;
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
export function PolicyGeneratorPanel({
  templates,
  categories,
  frameworks
}: {
  templates: PolicyTemplateItem[];
  categories: string[];
  frameworks: string[];
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [frameworkFilter, setFrameworkFilter] = useState('all');
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);
  const [formats, setFormats] = useState<Record<FormatType, boolean>>({
    markdown: true,
    html: true,
    json: false
  });
  const [pdfEnabled, setPdfEnabled] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Technology');
  const [organizationSize, setOrganizationSize] = useState('50-500');
  const [responsibleOfficer, setResponsibleOfficer] = useState('Chief Information Security Officer (CISO)');
  const [responsibleDepartment, setResponsibleDepartment] = useState('Information Security');
  const [contactEmail, setContactEmail] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reviewSchedule, setReviewSchedule] = useState<(typeof reviewSchedules)[number]>('Annually');
  const [version, setVersion] = useState('1.0');
  const [frameworkList, setFrameworkList] = useState('ISO 27001, SOC 2');
  const [regulationList, setRegulationList] = useState('None');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const textMatch =
        !search.trim() ||
        template.title.toLowerCase().includes(search.toLowerCase()) ||
        template.category.toLowerCase().includes(search.toLowerCase()) ||
        template.source.toLowerCase().includes(search.toLowerCase());
      const categoryMatch = categoryFilter === 'all' || template.category === categoryFilter;
      const frameworkMatch = frameworkFilter === 'all' || template.frameworks.includes(frameworkFilter);
      return textMatch && categoryMatch && frameworkMatch;
    });
  }, [templates, search, categoryFilter, frameworkFilter]);

  const selectedFormats = useMemo(() => {
    const enabled = (Object.entries(formats) as Array<[FormatType, boolean]>)
      .filter(([, active]) => active)
      .map(([format]) => format);

    if (pdfEnabled && !enabled.includes('html')) {
      enabled.push('html');
    }

    return enabled;
  }, [formats, pdfEnabled]);

  const documentsByPolicy = useMemo(() => {
    const byPolicy = new Map<string, GeneratedDocument[]>();
    for (const document of documents) {
      const existing = byPolicy.get(document.policyId) ?? [];
      existing.push(document);
      byPolicy.set(document.policyId, existing);
    }
    return byPolicy;
  }, [documents]);

  function togglePolicy(policyId: string) {
    setSelectedPolicyIds((current) => {
      if (current.includes(policyId)) return current.filter((id) => id !== policyId);
      return [...current, policyId];
    });
  }

  function applyPreset(type: 'foundational' | 'comprehensive') {
    const matchers = type === 'foundational' ? foundationalMatchers : comprehensiveMatchers;
    const limit = type === 'foundational' ? 5 : 10;
    setSelectedPolicyIds(pickByMatchers(templates, matchers, limit));
  }

  function selectFromFiltered(count: number) {
    setSelectedPolicyIds(filteredTemplates.slice(0, count).map((template) => template.id));
  }

  function toggleFormat(format: FormatType) {
    setFormats((current) => ({ ...current, [format]: !current[format] }));
  }

  function downloadDocument(fileDoc: GeneratedDocument) {
    const blob = new Blob([fileDoc.content], { type: fileDoc.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileDoc.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function generatePolicies() {
    setBusy(true);
    setError(null);
    setMessage(null);

    if (selectedPolicyIds.length === 0) {
      setBusy(false);
      setError('Select at least one policy template.');
      return;
    }

    if (selectedFormats.length === 0) {
      setBusy(false);
      setError('Select at least one output format.');
      return;
    }

    if (!companyName.trim() || !contactEmail.trim()) {
      setBusy(false);
      setError('Company name and contact email are required.');
      return;
    }

    const response = await fetch('/api/policies/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyIds: selectedPolicyIds,
        formats: selectedFormats,
        organization: {
          companyName: companyName.trim(),
          industry: industry.trim(),
          organizationSize: organizationSize.trim(),
          responsibleOfficer: responsibleOfficer.trim(),
          responsibleDepartment: responsibleDepartment.trim(),
          contactEmail: contactEmail.trim(),
          effectiveDate,
          reviewSchedule,
          version: version.trim() || '1.0',
          frameworks: splitList(frameworkList),
          regulations: splitList(regulationList)
        },
        notes: notes.trim() || undefined
      })
    });

    const payload = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(payload.error ?? 'Policy generation failed.');
      return;
    }

    setDocuments(payload.documents ?? []);
    setGeneratedAt(payload.generatedAt ?? null);
    setMessage(`Generated ${payload.documents?.length ?? 0} document(s).`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy Generator"
        description="Create customized cybersecurity policy documents using the vendored template library in this repository."
      />

      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Company name" />
          <Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="security@company.com" />
          <Input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Industry" />
          <Input
            value={organizationSize}
            onChange={(event) => setOrganizationSize(event.target.value)}
            placeholder="Organization size"
          />
          <Input
            value={responsibleOfficer}
            onChange={(event) => setResponsibleOfficer(event.target.value)}
            placeholder="Responsible officer"
          />
          <Input
            value={responsibleDepartment}
            onChange={(event) => setResponsibleDepartment(event.target.value)}
            placeholder="Responsible department"
          />
          <Input value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} type="date" />
          <Select value={reviewSchedule} onChange={(event) => setReviewSchedule(event.target.value as typeof reviewSchedule)}>
            {reviewSchedules.map((schedule) => (
              <option key={schedule} value={schedule}>
                {schedule}
              </option>
            ))}
          </Select>
          <Input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="Version (ex: 1.0)" />
          <Input
            value={frameworkList}
            onChange={(event) => setFrameworkList(event.target.value)}
            placeholder="Frameworks (comma-separated)"
          />
          <Input
            value={regulationList}
            onChange={(event) => setRegulationList(event.target.value)}
            placeholder="Regulations (comma-separated)"
            className="md:col-span-2"
          />
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional implementation notes to append to generated policies."
            className="md:col-span-2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policy Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => applyPreset('foundational')}>
              5 Foundational
            </Button>
            <Button type="button" variant="outline" onClick={() => applyPreset('comprehensive')}>
              10 Comprehensive
            </Button>
            <Button type="button" variant="outline" onClick={() => selectFromFiltered(3)}>
              Select Top 3
            </Button>
            <Button type="button" variant="outline" onClick={() => selectFromFiltered(10)}>
              Select Top 10
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSelectedPolicyIds([])}>
              Clear
            </Button>
            <span className="text-xs text-muted-foreground">{selectedPolicyIds.length} selected</span>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_220px_220px]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates..." />
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Select value={frameworkFilter} onChange={(event) => setFrameworkFilter(event.target.value)}>
              <option value="all">All frameworks</option>
              {frameworks.map((framework) => (
                <option key={framework} value={framework}>
                  {framework}
                </option>
              ))}
            </Select>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-md border border-border p-2">
            {filteredTemplates.map((template) => {
              const checked = selectedPolicyIds.includes(template.id);
              return (
                <label
                  key={template.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePolicy(template.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{template.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {template.source} | {template.category} | {template.type}
                      {template.wordCount > 0 ? ` | ${template.wordCount.toLocaleString()} words` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{template.frameworks.join(', ') || 'No frameworks listed'}</p>
                  </div>
                </label>
              );
            })}
            {filteredTemplates.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No policy templates matched your filters.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Output & Generate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formats.markdown} onChange={() => toggleFormat('markdown')} />
              Markdown (.md)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formats.html} onChange={() => toggleFormat('html')} />
              HTML (.html)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formats.json} onChange={() => toggleFormat('json')} />
              JSON (.json)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pdfEnabled} onChange={(event) => setPdfEnabled(event.target.checked)} />
              PDF (.pdf via Print dialog)
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            PDF export opens your browser print dialog from generated HTML. DOCX remains in vendored skill scripts.
          </p>
          <Button onClick={generatePolicies} disabled={busy}>
            {busy ? 'Generating...' : 'Generate Policy Documents'}
          </Button>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Generate policies to see downloadable files.</p>
          ) : (
            <>
              {generatedAt ? <p className="text-xs text-muted-foreground">Generated at {new Date(generatedAt).toLocaleString()}</p> : null}
              {[...documentsByPolicy.entries()].map(([policyId, policyDocuments]) => (
                <div key={policyId} className="rounded-md border border-border p-3">
                  <p className="text-sm font-semibold">{policyDocuments[0]?.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {policyDocuments
                      .filter((document) => document.format !== 'html' || formats.html)
                      .map((document) => (
                      <Button
                        key={`${document.policyId}-${document.format}`}
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(document)}
                      >
                        Download {document.format.toUpperCase()}
                      </Button>
                      ))}
                    {pdfEnabled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const htmlDocument = policyDocuments.find((document) => document.format === 'html');
                          if (!htmlDocument) {
                            setError('PDF export requires HTML output. Regenerate with PDF enabled.');
                            return;
                          }
                          const opened = openPrintWindow(htmlDocument.content);
                          if (!opened) {
                            setError('Popup blocked. Allow popups for this site and try again.');
                            return;
                          }
                          setMessage(`Print dialog opened for ${htmlDocument.title}. Choose "Save as PDF".`);
                        }}
                      >
                        Save PDF
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
