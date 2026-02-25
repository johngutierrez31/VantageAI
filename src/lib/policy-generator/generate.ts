import type { PolicyTemplate } from '@/lib/policy-generator/library';

type ReviewSchedule = 'Quarterly' | 'Semi-annually' | 'Annually' | 'Bi-annually';

export type PolicyGenerationFormat = 'markdown' | 'html' | 'json';

export type PolicyOrganizationInput = {
  companyName: string;
  industry: string;
  organizationSize: string;
  responsibleOfficer: string;
  responsibleDepartment: string;
  contactEmail: string;
  effectiveDate: string;
  reviewSchedule: ReviewSchedule;
  version: string;
  frameworks: string[];
  regulations: string[];
};

export type PolicyGenerationRequest = {
  templates: PolicyTemplate[];
  formats: PolicyGenerationFormat[];
  organization: PolicyOrganizationInput;
  generatedAt: string;
  notes?: string;
};

export type GeneratedPolicyDocument = {
  policyId: string;
  title: string;
  format: PolicyGenerationFormat;
  fileName: string;
  mimeType: string;
  content: string;
};

type SectionEntry = {
  title: string;
  content: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function toLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (part) => part.toUpperCase());
}

function replacePlaceholders(input: string, organization: PolicyOrganizationInput) {
  const replacements: Array<[string, string]> = [
    ['<Company Name>', organization.companyName],
    ['<YourCompanyName>', organization.companyName],
    ['[Company Name]', organization.companyName],
    ['<ResponsibleCorporateOfficer>', organization.responsibleOfficer],
    ['<Department>', organization.responsibleDepartment],
    ['[Department]', organization.responsibleDepartment],
    ['<Contact>', organization.contactEmail],
    ['<ContactEmail>', organization.contactEmail],
    ['<Effective Date>', organization.effectiveDate],
    ['<EffectiveDate>', organization.effectiveDate],
    ['[Effective Date]', organization.effectiveDate],
    ['<Review Date>', organization.reviewSchedule],
    ['<ReviewSchedule>', organization.reviewSchedule],
    ['<Version>', organization.version],
    ['<Industry>', organization.industry],
    ['<OrganizationSize>', organization.organizationSize]
  ];

  let value = input;
  for (const [token, replacement] of replacements) {
    value = value.split(token).join(replacement);
  }
  return value;
}

function toTextBlock(value: unknown, organization: PolicyOrganizationInput, depth = 0): string {
  if (typeof value === 'string') {
    return replacePlaceholders(value, organization).trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    return value
      .map((item) => toTextBlock(item, organization, depth + 1))
      .filter((line) => line.length > 0)
      .map((line) => `${'  '.repeat(depth)}- ${line.replace(/\n/g, `\n${'  '.repeat(depth + 1)}`)}`)
      .join('\n');
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '';
    return entries
      .map(([key, entry]) => {
        const text = toTextBlock(entry, organization, depth + 1);
        if (!text) return '';

        if (text.includes('\n')) {
          return `${'  '.repeat(depth)}- ${toLabel(key)}:\n${text}`;
        }

        return `${'  '.repeat(depth)}- ${toLabel(key)}: ${text}`;
      })
      .filter((line) => line.length > 0)
      .join('\n');
  }

  return '';
}

function normalizeSections(rawSections: unknown, organization: PolicyOrganizationInput): SectionEntry[] {
  if (typeof rawSections === 'string') {
    const content = toTextBlock(rawSections, organization);
    return content ? [{ title: 'Policy', content }] : [];
  }

  if (Array.isArray(rawSections)) {
    return rawSections
      .map((item, index) => {
        if (item && typeof item === 'object') {
          const data = item as Record<string, unknown>;
          const rawTitle = typeof data.title === 'string' ? data.title : `Section ${index + 1}`;
          const rawContent = data.content ?? data;
          const content = toTextBlock(rawContent, organization);
          return content ? { title: replacePlaceholders(rawTitle, organization), content } : null;
        }

        const content = toTextBlock(item, organization);
        return content ? { title: `Section ${index + 1}`, content } : null;
      })
      .filter((entry): entry is SectionEntry => Boolean(entry));
  }

  if (rawSections && typeof rawSections === 'object') {
    return Object.entries(rawSections as Record<string, unknown>)
      .map(([key, value]) => {
        const title = toLabel(key);
        const content = toTextBlock(value, organization);
        return content ? { title, content } : null;
      })
      .filter((entry): entry is SectionEntry => Boolean(entry));
  }

  return [];
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function buildMarkdownContent(
  template: PolicyTemplate,
  organization: PolicyOrganizationInput,
  generatedAt: string,
  notes?: string
) {
  const title = replacePlaceholders(template.title, organization);
  const purpose = replacePlaceholders(template.purpose ?? '', organization);
  const scope = replacePlaceholders(template.scope ?? '', organization);
  const sections = normalizeSections(template.sections, organization);
  const frameworks = uniqueStrings([...template.frameworks, ...organization.frameworks]);
  const regulations = uniqueStrings(organization.regulations);

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`**Company:** ${organization.companyName}`);
  lines.push(`**Version:** ${organization.version}`);
  lines.push(`**Effective Date:** ${organization.effectiveDate}`);
  lines.push(`**Review Schedule:** ${organization.reviewSchedule}`);
  lines.push(`**Responsible Officer:** ${organization.responsibleOfficer}`);
  lines.push(`**Department:** ${organization.responsibleDepartment}`);
  lines.push(`**Contact:** ${organization.contactEmail}`);
  lines.push(`**Generated At:** ${generatedAt}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  if (purpose) {
    lines.push('## Purpose');
    lines.push('');
    lines.push(purpose);
    lines.push('');
  }

  if (scope) {
    lines.push('## Scope');
    lines.push('');
    lines.push(scope);
    lines.push('');
  }

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(section.content);
    lines.push('');
  }

  lines.push('## Compliance');
  lines.push('');
  lines.push('This policy supports the following compliance objectives:');
  lines.push('');

  if (frameworks.length === 0) {
    lines.push('- Organization-defined frameworks');
  } else {
    for (const framework of frameworks) {
      lines.push(`- ${framework}`);
    }
  }

  if (regulations.length > 0) {
    lines.push('');
    lines.push('Regulatory requirements:');
    lines.push('');
    for (const regulation of regulations) {
      lines.push(`- ${regulation}`);
    }
  }

  lines.push('');
  lines.push('## Governance');
  lines.push('');
  lines.push(`Policy owner: ${organization.responsibleOfficer} (${organization.responsibleDepartment})`);
  lines.push(`Review cadence: ${organization.reviewSchedule}`);

  if (notes && notes.trim().length > 0) {
    lines.push('');
    lines.push('## Implementation Notes');
    lines.push('');
    lines.push(notes.trim());
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`Source Template: ${template.source} / ${template.category} / ${template.type}`);

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

function buildHtmlContent(
  template: PolicyTemplate,
  organization: PolicyOrganizationInput,
  generatedAt: string,
  notes?: string
) {
  const title = replacePlaceholders(template.title, organization);
  const purpose = replacePlaceholders(template.purpose ?? '', organization);
  const scope = replacePlaceholders(template.scope ?? '', organization);
  const sections = normalizeSections(template.sections, organization);
  const frameworks = uniqueStrings([...template.frameworks, ...organization.frameworks]);
  const regulations = uniqueStrings(organization.regulations);

  const sectionHtml = sections
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.title)}</h2><pre>${escapeHtml(section.content)}</pre></section>`
    )
    .join('\n');

  const frameworkList =
    frameworks.length > 0
      ? frameworks.map((framework) => `<li>${escapeHtml(framework)}</li>`).join('')
      : '<li>Organization-defined frameworks</li>';
  const regulationList =
    regulations.length > 0
      ? `<h3>Regulatory requirements</h3><ul>${regulations
          .map((regulation) => `<li>${escapeHtml(regulation)}</li>`)
          .join('')}</ul>`
      : '';

  const notesHtml =
    notes && notes.trim().length > 0
      ? `<section><h2>Implementation Notes</h2><p>${escapeHtml(notes.trim())}</p></section>`
      : '';

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    `  <title>${escapeHtml(title)}</title>`,
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <style>',
    '    body { font-family: Arial, sans-serif; margin: 2rem auto; max-width: 900px; line-height: 1.45; color: #111827; }',
    '    h1,h2,h3 { color: #0f172a; }',
    '    .meta { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 0.5rem; }',
    '    pre { white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.75rem; }',
    '    section { margin-top: 1.25rem; }',
    '  </style>',
    '</head>',
    '<body>',
    `  <h1>${escapeHtml(title)}</h1>`,
    '  <div class="meta">',
    `    <p><strong>Company:</strong> ${escapeHtml(organization.companyName)}</p>`,
    `    <p><strong>Version:</strong> ${escapeHtml(organization.version)}</p>`,
    `    <p><strong>Effective Date:</strong> ${escapeHtml(organization.effectiveDate)}</p>`,
    `    <p><strong>Review Schedule:</strong> ${escapeHtml(organization.reviewSchedule)}</p>`,
    `    <p><strong>Responsible Officer:</strong> ${escapeHtml(organization.responsibleOfficer)}</p>`,
    `    <p><strong>Department:</strong> ${escapeHtml(organization.responsibleDepartment)}</p>`,
    `    <p><strong>Contact:</strong> ${escapeHtml(organization.contactEmail)}</p>`,
    `    <p><strong>Generated At:</strong> ${escapeHtml(generatedAt)}</p>`,
    '  </div>',
    purpose ? `  <section><h2>Purpose</h2><p>${escapeHtml(purpose)}</p></section>` : '',
    scope ? `  <section><h2>Scope</h2><p>${escapeHtml(scope)}</p></section>` : '',
    sectionHtml,
    '  <section><h2>Compliance</h2>',
    '    <p>This policy supports the following compliance objectives:</p>',
    `    <ul>${frameworkList}</ul>`,
    `    ${regulationList}`,
    '  </section>',
    '  <section><h2>Governance</h2>',
    `    <p>Policy owner: ${escapeHtml(organization.responsibleOfficer)} (${escapeHtml(organization.responsibleDepartment)})</p>`,
    `    <p>Review cadence: ${escapeHtml(organization.reviewSchedule)}</p>`,
    '  </section>',
    notesHtml,
    `  <section><p><em>Source Template: ${escapeHtml(template.source)} / ${escapeHtml(template.category)} / ${escapeHtml(template.type)}</em></p></section>`,
    '</body>',
    '</html>'
  ]
    .filter(Boolean)
    .join('\n');
}

function buildJsonContent(
  template: PolicyTemplate,
  organization: PolicyOrganizationInput,
  generatedAt: string,
  notes?: string
) {
  const sections = normalizeSections(template.sections, organization);

  return JSON.stringify(
    {
      policyId: template.id,
      title: replacePlaceholders(template.title, organization),
      source: template.source,
      category: template.category,
      type: template.type,
      generatedAt,
      organization,
      purpose: replacePlaceholders(template.purpose ?? '', organization),
      scope: replacePlaceholders(template.scope ?? '', organization),
      sections,
      notes: notes?.trim() || null
    },
    null,
    2
  );
}

function formatDetails(format: PolicyGenerationFormat) {
  switch (format) {
    case 'html':
      return { extension: 'html', mimeType: 'text/html; charset=utf-8' };
    case 'json':
      return { extension: 'json', mimeType: 'application/json; charset=utf-8' };
    default:
      return { extension: 'md', mimeType: 'text/markdown; charset=utf-8' };
  }
}

function generateContentByFormat(
  format: PolicyGenerationFormat,
  template: PolicyTemplate,
  organization: PolicyOrganizationInput,
  generatedAt: string,
  notes?: string
) {
  if (format === 'html') return buildHtmlContent(template, organization, generatedAt, notes);
  if (format === 'json') return buildJsonContent(template, organization, generatedAt, notes);
  return buildMarkdownContent(template, organization, generatedAt, notes);
}

export function generatePolicyDocuments({
  templates,
  formats,
  organization,
  generatedAt,
  notes
}: PolicyGenerationRequest): GeneratedPolicyDocument[] {
  const documents: GeneratedPolicyDocument[] = [];

  for (const template of templates) {
    const baseName = `${slugify(template.title) || slugify(template.id) || 'policy'}-${slugify(organization.companyName) || 'org'}`;

    for (const format of formats) {
      const details = formatDetails(format);
      const content = generateContentByFormat(format, template, organization, generatedAt, notes);
      documents.push({
        policyId: template.id,
        title: template.title,
        format,
        fileName: `${baseName}.${details.extension}`,
        mimeType: details.mimeType,
        content
      });
    }
  }

  return documents;
}
