import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  incidentFindMany,
  incidentFindFirstOrThrow,
  incidentCreate,
  timelineCreate,
  runbookPackCreate,
  runbookPackFindUniqueOrThrow,
  taskFindMany,
  taskCreate,
  riskFindMany,
  transaction
} = vi.hoisted(() => ({
  incidentFindMany: vi.fn(),
  incidentFindFirstOrThrow: vi.fn(),
  incidentCreate: vi.fn(),
  timelineCreate: vi.fn(),
  runbookPackCreate: vi.fn(),
  runbookPackFindUniqueOrThrow: vi.fn(),
  taskFindMany: vi.fn(),
  taskCreate: vi.fn(),
  riskFindMany: vi.fn(),
  transaction: vi.fn()
}));

const { assertTenantReviewer } = vi.hoisted(() => ({
  assertTenantReviewer: vi.fn()
}));

const { syncIncidentConsequences } = vi.hoisted(() => ({
  syncIncidentConsequences: vi.fn()
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: transaction,
    incident: {
      findMany: incidentFindMany,
      findFirstOrThrow: incidentFindFirstOrThrow
    },
    riskRegisterItem: {
      findMany: riskFindMany
    }
  }
}));

vi.mock('@/lib/trust/reviewers', () => ({
  assertTenantReviewer
}));

vi.mock('@/lib/response-ops/consequences', () => ({
  syncIncidentConsequences
}));

import { createIncidentRecord, listIncidents } from '../src/lib/response-ops/records';

describe('response ops incident records', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        incident: {
          create: incidentCreate
        },
        incidentTimelineEvent: {
          create: timelineCreate
        },
        incidentRunbookPack: {
          create: runbookPackCreate,
          findUniqueOrThrow: runbookPackFindUniqueOrThrow
        },
        task: {
          findMany: taskFindMany,
          create: taskCreate
        }
      })
    );

    incidentCreate.mockResolvedValue({
      id: 'incident-1',
      tenantId: 'tenant-1',
      title: 'Ransomware or extortion response',
      description: 'Validation incident',
      incidentType: 'RANSOMWARE',
      severity: 'CRITICAL',
      status: 'TRIAGE',
      detectionSource: null,
      reportedBy: null,
      incidentOwnerUserId: 'reviewer-1',
      communicationsOwnerUserId: null,
      affectedSystems: [],
      affectedServices: [],
      affectedVendorNames: [],
      aiUseCaseId: null,
      aiVendorReviewId: null,
      questionnaireUploadId: null,
      trustInboxItemId: null,
      startedAt: new Date('2026-03-08T00:00:00.000Z'),
      declaredAt: new Date('2026-03-08T00:00:00.000Z'),
      containedAt: null,
      resolvedAt: null,
      nextUpdateDueAt: new Date('2026-03-08T01:00:00.000Z'),
      executiveSummary: 'Validation summary',
      internalNotes: null,
      linkedFindingIds: [],
      linkedRiskIds: [],
      linkedBoardBriefIds: [],
      linkedQuarterlyReviewIds: [],
      createdBy: 'user-1',
      createdAt: new Date('2026-03-08T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z')
    });
    taskFindMany.mockResolvedValue([]);
    taskCreate.mockResolvedValue({ id: 'task-1' });
    runbookPackCreate.mockResolvedValue({ id: 'pack-1' });
    runbookPackFindUniqueOrThrow.mockResolvedValue({ id: 'pack-1', tasks: [{ id: 'task-1' }] });
    incidentFindFirstOrThrow.mockResolvedValue({
      id: 'incident-1',
      title: 'Ransomware or extortion response',
      description: 'Validation incident',
      incidentType: 'RANSOMWARE',
      severity: 'CRITICAL',
      status: 'TRIAGE',
      detectionSource: null,
      reportedBy: null,
      incidentOwnerUserId: 'reviewer-1',
      communicationsOwnerUserId: null,
      affectedSystems: [],
      affectedServices: [],
      affectedVendorNames: [],
      executiveSummary: 'Validation summary',
      internalNotes: null,
      startedAt: new Date('2026-03-08T00:00:00.000Z'),
      nextUpdateDueAt: new Date('2026-03-08T01:00:00.000Z'),
      linkedFindingIds: [],
      linkedRiskIds: [],
      aiUseCase: null,
      aiVendorReview: null,
      questionnaireUpload: null,
      trustInboxItem: null,
      timelineEvents: [],
      runbookPacks: [],
      tasks: [],
      findings: [],
      afterActionReports: []
    });
    riskFindMany.mockResolvedValue([]);
    syncIncidentConsequences.mockResolvedValue({
      findingIds: ['finding-1'],
      riskIds: ['risk-1'],
      taskIds: ['task-1']
    });
  });

  it('creates guided incident records with timeline scaffolding and runbook work', async () => {
    const detail = await createIncidentRecord({
      tenantId: 'tenant-1',
      userId: 'user-1',
      input: {
        incidentType: 'RANSOMWARE',
        severity: 'CRITICAL',
        incidentOwnerUserId: 'reviewer-1',
        guidedStart: true,
        launchRunbookPack: true
      }
    });

    expect(assertTenantReviewer).toHaveBeenCalledWith('tenant-1', 'reviewer-1');
    expect(incidentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        incidentType: 'RANSOMWARE',
        severity: 'CRITICAL',
        status: 'TRIAGE'
      })
    });
    expect(timelineCreate).toHaveBeenCalledTimes(4);
    expect(taskCreate).toHaveBeenCalled();
    expect(syncIncidentConsequences).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'incident-1',
        severity: 'CRITICAL'
      })
    );
    expect(detail.incident.id).toBe('incident-1');
    expect(detail.risks).toEqual([]);
  });

  it('applies tenant-scoped incident filters to list queries', async () => {
    incidentFindMany.mockResolvedValue([]);

    await listIncidents('tenant-1', {
      status: 'ACTIVE',
      severity: 'HIGH',
      incidentType: 'PHISHING',
      ownerUserId: 'reviewer-1',
      search: 'mailbox'
    });

    expect(incidentFindMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        severity: 'HIGH',
        incidentType: 'PHISHING',
        incidentOwnerUserId: 'reviewer-1',
        OR: [
          { title: { contains: 'mailbox', mode: 'insensitive' } },
          { description: { contains: 'mailbox', mode: 'insensitive' } },
          { detectionSource: { contains: 'mailbox', mode: 'insensitive' } }
        ]
      }),
      include: expect.objectContaining({
        runbookPacks: expect.any(Object),
        afterActionReports: expect.any(Object)
      }),
      orderBy: [{ status: 'asc' }, { severity: 'desc' }, { updatedAt: 'desc' }],
      take: 80
    });
  });
});
