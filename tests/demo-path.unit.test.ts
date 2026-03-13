import { describe, expect, it } from 'vitest';
import { buildDemoPathViewModel } from '@/lib/demo/demo-path';

describe('demo path view model', () => {
  it('builds a seeded cross-module wow path from available records', () => {
    const viewModel = buildDemoPathViewModel({
      trustInbox: {
        id: 'trust_inbox_1',
        title: 'Northbridge Payments trust request',
        status: 'IN_REVIEW'
      },
      questionnaire: {
        id: 'questionnaire_1',
        filename: 'northbridge-security-questionnaire.xlsx',
        organizationName: 'Northbridge Payments',
        status: 'NEEDS_REVIEW'
      },
      evidenceMap: {
        id: 'evidence_map_1',
        name: 'Northbridge Payments evidence map',
        status: 'NEEDS_REVIEW'
      },
      boardBrief: {
        id: 'board_brief_1',
        title: 'Q1 board brief - cyber posture and buyer readiness',
        status: 'APPROVED'
      },
      quarterlyReview: {
        id: 'quarterly_review_1',
        reviewPeriod: '2026 Q1',
        status: 'FINALIZED'
      },
      aiUseCase: {
        id: 'ai_use_case_1',
        name: 'TrustOps questionnaire response copilot',
        status: 'APPROVED_WITH_CONDITIONS'
      },
      aiVendorReview: {
        id: 'ai_vendor_1',
        vendorName: 'AnswerFlow AI',
        productName: 'AnswerFlow Copilot',
        status: 'APPROVED_WITH_CONDITIONS'
      },
      activeIncident: {
        id: 'incident_active_1',
        title: 'AnswerFlow retention assurance vendor notice',
        status: 'ACTIVE'
      },
      afterActionIncident: {
        id: 'incident_resolved_1',
        title: 'Privileged mailbox phishing attempt',
        status: 'POST_INCIDENT_REVIEW',
        reportStatus: 'APPROVED'
      },
      tabletop: {
        id: 'tabletop_1',
        title: 'Q2 ransomware leadership tabletop',
        status: 'DRAFT'
      }
    });

    expect(viewModel.threeMinutePath).toHaveLength(5);
    expect(viewModel.threeMinutePath[1]).toMatchObject({
      label: 'Northbridge Payments trust request',
      href: '/app/trust/inbox/trust_inbox_1',
      status: 'IN_REVIEW'
    });
    expect(viewModel.threeMinutePath[3]).toMatchObject({
      label: 'TrustOps questionnaire response copilot',
      href: '/app/ai-governance/use-cases/ai_use_case_1'
    });
    expect(viewModel.artifacts[4]).toMatchObject({
      label: 'Privileged mailbox phishing attempt',
      href: '/app/response-ops/incidents/incident_resolved_1',
      status: 'APPROVED'
    });
  });

  it('falls back to stable module routes when seeded records are missing', () => {
    const viewModel = buildDemoPathViewModel({
      trustInbox: null,
      questionnaire: null,
      evidenceMap: null,
      boardBrief: null,
      quarterlyReview: null,
      aiUseCase: null,
      aiVendorReview: null,
      activeIncident: null,
      afterActionIncident: null,
      tabletop: null
    });

    expect(viewModel.threeMinutePath.map((step) => step.href)).toEqual([
      '/app/command-center',
      '/app/trust',
      '/app/pulse',
      '/app/ai-governance',
      '/app/response-ops'
    ]);
    expect(viewModel.tenMinutePath[2]).toMatchObject({
      href: '/app/questionnaires'
    });
  });
});
