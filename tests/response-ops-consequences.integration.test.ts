import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  taskFindMany,
  taskFindFirst,
  taskCreate,
  findingFindFirst,
  findingCreate,
  findingUpdate,
  findingUpdateMany,
  riskUpsert,
  riskUpdateMany,
  incidentUpdate,
  tabletopUpdate
} = vi.hoisted(() => ({
  taskFindMany: vi.fn(),
  taskFindFirst: vi.fn(),
  taskCreate: vi.fn(),
  findingFindFirst: vi.fn(),
  findingCreate: vi.fn(),
  findingUpdate: vi.fn(),
  findingUpdateMany: vi.fn(),
  riskUpsert: vi.fn(),
  riskUpdateMany: vi.fn(),
  incidentUpdate: vi.fn(),
  tabletopUpdate: vi.fn()
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    task: {
      findMany: taskFindMany,
      findFirst: taskFindFirst,
      create: taskCreate
    },
    finding: {
      findFirst: findingFindFirst,
      create: findingCreate,
      update: findingUpdate,
      updateMany: findingUpdateMany
    },
    riskRegisterItem: {
      upsert: riskUpsert,
      updateMany: riskUpdateMany
    },
    incident: {
      update: incidentUpdate
    },
    tabletopExercise: {
      update: tabletopUpdate
    }
  }
}));

import {
  syncIncidentConsequences,
  syncTabletopConsequences
} from '../src/lib/response-ops/consequences';

describe('response ops downstream consequence sync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    taskFindMany.mockResolvedValue([{ id: 'task-1' }]);
    taskFindFirst.mockResolvedValue(null);
    taskCreate.mockResolvedValue({ id: 'task-2' });
    findingFindFirst.mockResolvedValue(null);
    findingCreate.mockResolvedValue({ id: 'finding-1' });
    findingUpdate.mockResolvedValue({ id: 'finding-1' });
    findingUpdateMany.mockResolvedValue({ count: 1 });
    riskUpsert.mockResolvedValue({ id: 'risk-1' });
    riskUpdateMany.mockResolvedValue({ count: 1 });
    incidentUpdate.mockResolvedValue({ id: 'incident-1' });
    tabletopUpdate.mockResolvedValue({ id: 'tabletop-1' });
  });

  it('creates finding and risk pressure for open high-severity incidents', async () => {
    const result = await syncIncidentConsequences({
      id: 'incident-1',
      tenantId: 'tenant-1',
      title: 'Validation vendor breach',
      description: 'Third-party compromise with buyer-facing impact.',
      executiveSummary: 'Executive update pending.',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      incidentType: 'THIRD_PARTY_BREACH',
      incidentOwnerUserId: 'user-1',
      aiUseCaseId: null,
      aiVendorReviewId: null,
      questionnaireUploadId: 'questionnaire-1',
      linkedFindingIds: [],
      linkedRiskIds: [],
      nextUpdateDueAt: new Date('2026-03-09T12:00:00.000Z'),
      createdBy: 'user-1'
    } as never);

    expect(findingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        incidentId: 'incident-1',
        sourceType: 'RESPONSE_OPS_INCIDENT',
        priority: 'CRITICAL',
        questionnaireUploadId: 'questionnaire-1'
      })
    });
    expect(riskUpsert).toHaveBeenCalledWith({
      where: {
        tenantId_sourceKey: {
          tenantId: 'tenant-1',
          sourceKey: 'incident:incident-1'
        }
      },
      update: expect.objectContaining({
        sourceModule: 'RESPONSE_OPS',
        linkedIncidentIds: ['incident-1']
      }),
      create: expect.objectContaining({
        sourceModule: 'RESPONSE_OPS',
        linkedIncidentIds: ['incident-1']
      })
    });
    expect(incidentUpdate).toHaveBeenCalledWith({
      where: { id: 'incident-1' },
      data: {
        linkedFindingIds: ['finding-1'],
        linkedRiskIds: ['risk-1']
      }
    });
    expect(result).toEqual({
      findingIds: ['finding-1'],
      riskIds: ['risk-1'],
      taskIds: ['task-1']
    });
  });

  it('creates tabletop follow-up tasks, findings, and risks when an exercise is completed', async () => {
    const result = await syncTabletopConsequences({
      id: 'tabletop-1',
      tenantId: 'tenant-1',
      title: 'Validation AI misuse tabletop',
      scenarioType: 'AI_MISUSE',
      status: 'COMPLETED',
      exerciseDate: new Date('2026-03-20T15:00:00.000Z'),
      gapsIdentified: ['AI workflow shutdown authority is unclear.'],
      followUpActions: ['Document shutdown authority for on-call operators.'],
      createdBy: 'user-1'
    } as never);

    expect(taskCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        tabletopExerciseId: 'tabletop-1',
        responseOpsPhase: 'POST_INCIDENT_REVIEW'
      })
    });
    expect(findingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        tabletopExerciseId: 'tabletop-1',
        sourceType: 'RESPONSE_OPS_TABLETOP'
      })
    });
    expect(riskUpsert).toHaveBeenCalledWith({
      where: {
        tenantId_sourceKey: {
          tenantId: 'tenant-1',
          sourceKey: 'tabletop:tabletop-1'
        }
      },
      update: expect.objectContaining({
        sourceModule: 'RESPONSE_OPS',
        linkedTabletopIds: ['tabletop-1']
      }),
      create: expect.objectContaining({
        sourceModule: 'RESPONSE_OPS',
        linkedTabletopIds: ['tabletop-1']
      })
    });
    expect(tabletopUpdate).toHaveBeenCalledWith({
      where: { id: 'tabletop-1' },
      data: {
        linkedFindingIds: ['finding-1'],
        linkedRiskIds: ['risk-1'],
        linkedTaskIds: ['task-2']
      }
    });
    expect(result).toEqual({
      findingIds: ['finding-1'],
      riskIds: ['risk-1'],
      taskIds: ['task-2']
    });
  });
});
