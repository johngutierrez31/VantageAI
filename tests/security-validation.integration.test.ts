import { describe, expect, it } from 'vitest';
import { requireRole } from '../src/lib/rbac/authorize';
import { policyGenerationRequestSchema } from '../src/lib/validation/policy-generator';
import { cyberRangeGenerationRequestSchema } from '../src/lib/validation/cyber-range';

describe('security and validation guardrails', () => {
  it('enforces role boundaries for protected operations', () => {
    const viewerSession = {
      userId: 'user_viewer',
      tenantId: 'tenant_demo',
      tenantSlug: 'demo-tenant',
      tenantName: 'Demo Tenant',
      workspaceMode: 'PAID' as const,
      isDemoWorkspace: false,
      role: 'VIEWER' as const,
      memberships: []
    };

    expect(() => requireRole(viewerSession, 'MEMBER')).toThrow('Forbidden for role VIEWER');
    expect(() => requireRole({ ...viewerSession, role: 'ADMIN' as const }, 'MEMBER')).not.toThrow();
  });

  it('accepts valid policy generation payloads and rejects malformed dates', () => {
    const validPayload = {
      policyIds: ['policy-1'],
      formats: ['markdown'],
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
        frameworks: ['SOC 2'],
        regulations: ['GDPR']
      },
      notes: 'Policy generation smoke test'
    };

    expect(() => policyGenerationRequestSchema.parse(validPayload)).not.toThrow();
    expect(() =>
      policyGenerationRequestSchema.parse({
        ...validPayload,
        organization: { ...validPayload.organization, effectiveDate: '03/04/2026' }
      })
    ).toThrow('effectiveDate must be YYYY-MM-DD');
  });

  it('coerces numeric cyber-range inputs and applies defaults', () => {
    const parsed = cyberRangeGenerationRequestSchema.parse({
      rangeName: 'Rapid Defense Range',
      organizationName: 'Vantage Labs',
      primaryUseCase: 'Train SOC analysts to detect and contain simulated adversary activity.',
      environment: 'cloud',
      scale: 'small',
      fidelity: 'medium',
      durationDays: '2',
      participants: '24',
      complianceTags: ['SOC 2']
    });

    expect(parsed.durationDays).toBe(2);
    expect(parsed.participants).toBe(24);
    expect(parsed.includeIdentityZone).toBe(true);
    expect(parsed.includeOtZone).toBe(false);
    expect(parsed.includeNpcTraffic).toBe(true);
  });
});
