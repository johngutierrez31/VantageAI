import { describe, expect, it } from 'vitest';
import { generateCyberRangePlan } from '../src/lib/cyber-range/generate';
import { cyberRangeGenerationRequestSchema } from '../src/lib/validation/cyber-range';

describe('cyber range generation workflow', () => {
  it('builds a complete range plan from validated input', () => {
    const payload = cyberRangeGenerationRequestSchema.parse({
      rangeName: 'Q2 Incident Response Range',
      organizationName: 'Acme Security',
      primaryUseCase: 'Run tabletop-to-live exercises for SOC and incident response teams.',
      environment: 'hybrid',
      scale: 'medium',
      fidelity: 'high',
      durationDays: 3,
      participants: 120,
      includeIdentityZone: true,
      includeOtZone: true,
      includeNpcTraffic: true,
      complianceTags: ['NIST CSF', 'SOC 2']
    });

    const plan = generateCyberRangePlan(payload);

    expect(plan.planId).toContain('range-q2-incident-response-range');
    expect(plan.zones.some((zone) => zone.name === 'Identity Zone')).toBe(true);
    expect(plan.zones.some((zone) => zone.name === 'OT/ICS Zone')).toBe(true);
    expect(plan.phases[0]?.order).toBe(1);
    expect(plan.phases.at(-1)?.title).toBe('Exercise Readiness');
    expect(plan.successCriteria.some((criterion) => criterion.includes('safety controls'))).toBe(true);
    expect(plan.markdown).toContain('## Zone Architecture');
    expect(plan.markdown).toContain('## Success Criteria');
  });
});

