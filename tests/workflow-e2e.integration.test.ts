import { describe, expect, it } from 'vitest';
import { parseQuestionnaireImport } from '../src/lib/questionnaire/parser';
import { mapQuestionnaireRows } from '../src/lib/questionnaire/mapping';
import { computeAssessmentScore } from '../src/lib/scoring/engine';
import { buildReportExport } from '../src/lib/report/export';

describe('cross-workflow e2e (import -> scoring -> report export)', () => {
  it('turns imported questionnaire responses into a branded report export', async () => {
    const csv = [
      'question,answer,score,confidence',
      'Do you maintain approved security policies?,Yes,3,0.8',
      'Is MFA required for admins?,Yes,4,0.9',
      'Are access reviews done quarterly?,No,1,0.7'
    ].join('\n');

    const importedRows = parseQuestionnaireImport('csv', csv);
    const mappings = mapQuestionnaireRows(importedRows, [
      { id: 'q1', prompt: 'Do you maintain approved security policies?' },
      { id: 'q2', prompt: 'Is MFA enforced for privileged accounts?' },
      { id: 'q3', prompt: 'Are access reviews performed at least quarterly?' }
    ]);

    const scoringInputs = mappings
      .filter((mapping) => mapping.mappedQuestionId)
      .map((mapping) => ({
        domain: mapping.mappedQuestionId === 'q1' ? 'Governance' : 'Access',
        controlCode:
          mapping.mappedQuestionId === 'q1'
            ? 'SEC-GOV-1'
            : mapping.mappedQuestionId === 'q2'
              ? 'SEC-ACC-1'
              : 'SEC-ACC-2',
        score: mapping.sourceScore ?? 0,
        weight: 1,
        confidence: mapping.sourceConfidence ?? 0.5
      }));

    const score = computeAssessmentScore(scoringInputs);
    expect(score.overall).toBeGreaterThan(0);
    expect(score.byDomain.Access).toBeDefined();

    const report = {
      id: 'rep_e2e_1',
      tenantId: 'tenant_demo',
      assessmentId: 'asm_e2e_1',
      title: 'E2E Assessment Report',
      summary: `Overall readiness ${score.overall}/4`,
      markdown: `# E2E Assessment Report\n\nOverall readiness ${score.overall}/4`,
      jsonPayload: { score },
      generatedBy: 'user_demo',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    const branding = {
      id: 'brand_demo',
      tenantId: 'tenant_demo',
      companyName: 'Vantage Labs',
      logoUrl: null,
      primaryColor: '#0f172a',
      accentColor: '#2563eb',
      footerNote: 'Not legal advice.',
      updatedAt: new Date()
    } as any;

    const htmlExport = await buildReportExport(report, branding, 'Demo Tenant', 'html');
    expect(htmlExport.contentType).toContain('text/html');
    expect(htmlExport.extension).toBe('html');
    expect(htmlExport.body).toContain('Vantage Labs');
    expect(htmlExport.body).toContain('E2E Assessment Report');
  });
});
