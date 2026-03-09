import { describe, expect, it } from 'vitest';
import { mergeRiskCandidatesBySourceKey } from '../src/lib/pulse/risk-register';

describe('pulse risk candidate merging', () => {
  it('merges duplicate source keys and preserves linked references', () => {
    const merged = mergeRiskCandidatesBySourceKey([
      {
        tenantId: 'tenant-1',
        sourceKey: 'finding:1',
        sourceType: 'TRUSTOPS_EVIDENCE_GAP',
        sourceModule: 'TRUSTOPS',
        title: 'Missing MFA evidence',
        normalizedRiskStatement: 'missing mfa evidence',
        description: 'Missing buyer-safe evidence.',
        businessImpactSummary: 'Procurement delay.',
        severity: 'HIGH',
        likelihood: 'HIGH',
        impact: 'HIGH',
        linkedControlIds: ['IAM-1'],
        linkedFindingIds: ['finding-1'],
        linkedTaskIds: ['task-1'],
        createdBy: 'user-1'
      },
      {
        tenantId: 'tenant-1',
        sourceKey: 'finding:1',
        sourceType: 'TRUSTOPS_EVIDENCE_GAP',
        sourceModule: 'TRUSTOPS',
        title: 'Missing MFA evidence',
        normalizedRiskStatement: 'missing mfa evidence',
        description: 'Missing buyer-safe evidence.',
        businessImpactSummary: 'Procurement delay.',
        severity: 'HIGH',
        likelihood: 'HIGH',
        impact: 'HIGH',
        linkedControlIds: ['IAM-2'],
        linkedFindingIds: ['finding-1'],
        linkedTaskIds: ['task-2'],
        createdBy: 'user-1'
      }
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.linkedControlIds).toEqual(['IAM-1', 'IAM-2']);
    expect(merged[0]?.linkedTaskIds).toEqual(['task-1', 'task-2']);
  });
});
