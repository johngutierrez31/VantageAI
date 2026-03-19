import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionContext } = vi.hoisted(() => ({
  getSessionContext: vi.fn()
}));

const { afterActionFindFirstOrThrow, afterActionUpdate } = vi.hoisted(() => ({
  afterActionFindFirstOrThrow: vi.fn(),
  afterActionUpdate: vi.fn()
}));

const { writeAuditLog } = vi.hoisted(() => ({
  writeAuditLog: vi.fn()
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionContext
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    afterActionReport: {
      findFirstOrThrow: afterActionFindFirstOrThrow,
      update: afterActionUpdate
    }
  }
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog
}));

import { GET } from '../src/app/api/response-ops/after-action/[reportId]/export/route';

describe('response ops after-action export route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSessionContext.mockResolvedValue({
      tenantId: 'tenant-1',
      userId: 'user-1'
    });
    afterActionUpdate.mockResolvedValue({ id: 'report-1' });
  });

  it('blocks export until the report is approved', async () => {
    afterActionFindFirstOrThrow.mockResolvedValue({
      id: 'report-1',
      tenantId: 'tenant-1',
      incidentId: 'incident-1',
      title: 'After Action Report',
      status: 'NEEDS_REVIEW',
      summary: 'Summary',
      affectedScope: 'Scope',
      timelineSummary: [],
      actionsTaken: [],
      currentStatus: 'ACTIVE',
      lessonsLearned: [],
      followUpActions: [],
      decisionsNeeded: [],
      reviewerNotes: null,
      createdBy: 'user-1',
      reviewedBy: null,
      approvedBy: null,
      reviewedAt: null,
      approvedAt: null,
      lastExportedAt: null,
      exportCount: 0,
      createdAt: new Date('2026-03-08T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z'),
      incident: {
        title: 'Validation incident',
        incidentType: 'RANSOMWARE',
        severity: 'HIGH',
        status: 'ACTIVE',
        startedAt: new Date('2026-03-08T00:00:00.000Z'),
        resolvedAt: null
      }
    });

    const response = await GET(
      new Request('http://127.0.0.1:3000/api/response-ops/after-action/report-1/export?format=html'),
      { params: { reportId: 'report-1' } }
    );

    expect(response.status).toBe(409);
    expect(afterActionUpdate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: 'After-action report must be approved before export.'
    });
  });

  it('exports approved reports and records export activity', async () => {
    afterActionFindFirstOrThrow.mockResolvedValue({
      id: 'report-1',
      tenantId: 'tenant-1',
      incidentId: 'incident-1',
      title: 'After Action Report',
      status: 'APPROVED',
      summary: 'Summary',
      affectedScope: 'Scope',
      timelineSummary: ['Declared and contained.'],
      actionsTaken: ['Revoked sessions.'],
      currentStatus: 'RESOLVED',
      lessonsLearned: ['Communication ownership was clear.'],
      followUpActions: ['Refresh vendor response runbook.'],
      decisionsNeeded: ['Approve additional backup testing.'],
      reviewerNotes: null,
      createdBy: 'user-1',
      reviewedBy: 'user-1',
      approvedBy: 'user-1',
      reviewedAt: new Date('2026-03-08T00:00:00.000Z'),
      approvedAt: new Date('2026-03-08T00:00:00.000Z'),
      lastExportedAt: null,
      exportCount: 0,
      createdAt: new Date('2026-03-08T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z'),
      incident: {
        title: 'Validation incident',
        incidentType: 'RANSOMWARE',
        severity: 'HIGH',
        status: 'RESOLVED',
        startedAt: new Date('2026-03-08T00:00:00.000Z'),
        resolvedAt: new Date('2026-03-08T02:00:00.000Z')
      }
    });

    const response = await GET(
      new Request('http://127.0.0.1:3000/api/response-ops/after-action/report-1/export?format=html'),
      { params: { reportId: 'report-1' } }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('content-disposition')).toContain(
      'vantageciso-after-action-after-action-report-validation-incident.html'
    );
    await expect(response.text()).resolves.toContain('After Action Report');
    expect(afterActionUpdate).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: {
        lastExportedAt: expect.any(Date),
        exportCount: { increment: 1 }
      }
    });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        entityType: 'after_action_report',
        action: 'after_action_exported'
      })
    );
  });
});
