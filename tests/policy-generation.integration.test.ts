import { describe, expect, it } from 'vitest';
import { generatePolicyDocuments } from '../src/lib/policy-generator/generate';
import { getPolicyCatalog, getPolicyTemplatesByIds } from '../src/lib/policy-generator/library';

describe('policy generation workflow', () => {
  it('loads templates from catalog and generates markdown/html/json artifacts', async () => {
    const catalog = await getPolicyCatalog();
    expect(catalog.policies.length).toBeGreaterThan(0);

    const selectedIds = catalog.policies.slice(0, 2).map((policy) => policy.id);
    const templates = await getPolicyTemplatesByIds(selectedIds);
    expect(templates).toHaveLength(selectedIds.length);

    const generatedAt = '2026-03-04T00:00:00.000Z';
    const documents = generatePolicyDocuments({
      templates,
      formats: ['markdown', 'html', 'json'],
      generatedAt,
      organization: {
        companyName: 'Vantage Labs',
        industry: 'Cybersecurity',
        organizationSize: '51-200',
        responsibleOfficer: 'Jane Doe',
        responsibleDepartment: 'Security',
        contactEmail: 'security@vantagelabs.example',
        effectiveDate: '2026-03-04',
        reviewSchedule: 'Quarterly',
        version: '1.0',
        frameworks: ['SOC 2', 'ISO 27001'],
        regulations: ['GDPR']
      },
      notes: 'Generated during automated deep integration checks.'
    });

    expect(documents).toHaveLength(templates.length * 3);
    expect(documents.every((doc) => doc.fileName.length > 0)).toBe(true);
    expect(documents.some((doc) => doc.mimeType.includes('text/markdown'))).toBe(true);
    expect(documents.some((doc) => doc.mimeType.includes('text/html'))).toBe(true);
    expect(documents.some((doc) => doc.mimeType.includes('application/json'))).toBe(true);
    expect(documents.every((doc) => doc.content.includes('Vantage Labs'))).toBe(true);
  });
});

