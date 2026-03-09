import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getPolicyCatalogMock } = vi.hoisted(() => ({
  getPolicyCatalogMock: vi.fn()
}));

vi.mock('@/lib/policy-generator/library', () => ({
  getPolicyCatalog: getPolicyCatalogMock
}));

import { evaluateAIGovernancePolicy } from '../src/lib/ai-governance/policy-mapping';

describe('ai governance policy mapping', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getPolicyCatalogMock.mockResolvedValue({
      policies: [
        {
          id: 'policy-ai-1',
          title: 'AI Acceptable Use',
          category: 'AI Governance',
          type: 'Policy',
          tags: ['ai', 'acceptable use', 'logging'],
          frameworks: ['SOC 2']
        },
        {
          id: 'policy-vendor-1',
          title: 'Third-Party Security Review',
          category: 'Vendor Risk',
          type: 'Standard',
          tags: ['vendor', 'third party', 'security'],
          frameworks: ['ISO 27001']
        }
      ]
    });
  });

  it('rejects high-exposure workflows with prohibited sensitive data classes', async () => {
    const result = await evaluateAIGovernancePolicy({
      useCaseType: 'CUSTOMER_FACING',
      workflowType: 'AGENT',
      deploymentContext: 'SAAS',
      dataClasses: ['PHI', 'SECRETS', 'CUSTOMER_DATA'],
      linkedPolicyIds: ['tenant-policy-1'],
      customerDataInvolved: 'YES',
      regulatedDataInvolved: 'YES',
      secretsInvolved: 'YES',
      externalToolAccess: 'YES',
      internetAccess: 'YES',
      humanReviewRequired: false,
      vendorSignals: {
        hasApprovedVendorReview: false,
        retentionPolicyStatus: 'UNKNOWN',
        trainsOnCustomerData: 'YES',
        subprocessorsStatus: 'UNKNOWN',
        loggingSupport: 'NO',
        authenticationSupport: 'NO'
      }
    });

    expect(result.riskTier).toBe('CRITICAL');
    expect(result.prohibitedDataClasses).toEqual(expect.arrayContaining(['PHI', 'SECRETS']));
    expect(result.recommendedDecision).toBe('REJECTED');
    expect(result.approvalBlockers).toEqual(
      expect.arrayContaining(['HUMAN_REVIEW_REQUIRED', 'NO_CUSTOMER_SECRETS', 'NO_REGULATED_DATA'])
    );
    expect(result.matchedPolicyIds).toEqual(
      expect.arrayContaining(['tenant-policy-1', 'policy-ai-1', 'policy-vendor-1'])
    );
    expect(result.requiredControls.length).toBeGreaterThan(0);
  });

  it('approves low-risk internal workflows with known controls', async () => {
    const result = await evaluateAIGovernancePolicy({
      useCaseType: 'INTERNAL_PRODUCTIVITY',
      workflowType: 'ANALYTICS',
      deploymentContext: 'INTERNAL',
      dataClasses: ['PUBLIC', 'INTERNAL'],
      customerDataInvolved: 'NO',
      regulatedDataInvolved: 'NO',
      secretsInvolved: 'NO',
      externalToolAccess: 'NO',
      internetAccess: 'NO',
      humanReviewRequired: true
    });

    expect(result.riskTier).toBe('LOW');
    expect(result.allowedDataClasses).toEqual(expect.arrayContaining(['PUBLIC', 'INTERNAL']));
    expect(result.unmetRequirements).toEqual([]);
    expect(result.approvalBlockers).toEqual([]);
    expect(result.recommendedDecision).toBe('APPROVED');
  });
});
