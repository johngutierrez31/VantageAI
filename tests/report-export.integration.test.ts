import { describe, expect, it } from 'vitest';
import { buildReportExport } from '../src/lib/report/export';

describe('branded report export workflow', () => {
  it('renders branded HTML export payload', async () => {
    const report = {
      id: 'rep_1',
      tenantId: 'tenant_demo',
      assessmentId: 'asm_1',
      title: 'Quarterly Security Report',
      summary: 'Summary',
      markdown: '# Quarterly Security Report\n\n## Executive Summary\n\nStable controls.',
      jsonPayload: { score: 3.1 },
      generatedBy: 'user_1',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    const branding = {
      id: 'brand_1',
      tenantId: 'tenant_demo',
      companyName: 'Acme Security',
      logoUrl: null,
      primaryColor: '#112233',
      accentColor: '#445566',
      footerNote: 'Not legal advice.',
      updatedAt: new Date()
    } as any;

    const payload = await buildReportExport(report, branding, 'Demo Tenant', 'html');

    expect(payload.contentType).toContain('text/html');
    expect(payload.body).toContain('Acme Security');
    expect(payload.body).toContain('Quarterly Security Report');
  });
});
