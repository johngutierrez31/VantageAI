import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findingFindFirst, findingUpdate, findingCreate, findingUpdateMany } = vi.hoisted(() => ({
  findingFindFirst: vi.fn(),
  findingUpdate: vi.fn(),
  findingCreate: vi.fn(),
  findingUpdateMany: vi.fn()
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    finding: {
      findFirst: findingFindFirst,
      update: findingUpdate,
      create: findingCreate,
      updateMany: findingUpdateMany
    }
  }
}));

import {
  resolveTrustFindingsForQuestionnaireItem,
  syncTrustFinding
} from '../src/lib/trust/findings';

describe('trustops finding sync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('updates an existing open finding instead of creating a duplicate', async () => {
    findingFindFirst.mockResolvedValue({
      id: 'finding-1',
      status: 'OPEN'
    });
    findingUpdate.mockResolvedValue({
      id: 'finding-1',
      title: 'Evidence gap for row-1'
    });

    const finding = await syncTrustFinding({
      tenantId: 'tenant-1',
      sourceType: 'TRUSTOPS_EVIDENCE_GAP',
      questionnaireUploadId: 'upload-1',
      questionnaireItemId: 'item-1',
      taskId: 'task-1',
      ownerUserId: 'user-1',
      createdBy: 'user-1',
      title: 'Evidence gap for row-1',
      description: 'Missing approved evidence.',
      controlCode: 'AC-1',
      supportStrength: 'MISSING',
      priority: 'HIGH'
    });

    expect(findingFindFirst).toHaveBeenCalled();
    expect(findingUpdate).toHaveBeenCalledWith({
      where: { id: 'finding-1' },
      data: expect.objectContaining({
        title: 'Evidence gap for row-1',
        taskId: 'task-1',
        supportStrength: 'MISSING',
        priority: 'HIGH'
      })
    });
    expect(findingCreate).not.toHaveBeenCalled();
    expect(finding.id).toBe('finding-1');
  });

  it('resolves open TrustOps findings for a questionnaire item', async () => {
    findingUpdateMany.mockResolvedValue({ count: 2 });

    const result = await resolveTrustFindingsForQuestionnaireItem({
      tenantId: 'tenant-1',
      questionnaireItemId: 'item-1',
      sourceType: 'TRUSTOPS_REJECTION'
    });

    expect(findingUpdateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        questionnaireItemId: 'item-1',
        sourceType: 'TRUSTOPS_REJECTION',
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      },
      data: {
        status: 'RESOLVED'
      }
    });
    expect(result).toEqual({ count: 2 });
  });
});
