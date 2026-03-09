import { describe, expect, it } from 'vitest';
import { buildSevenDayMissionQueue, type TenantSecurityPulse } from '../src/lib/intel/pulse';
import { getTrendSignals } from '../src/lib/intel/trends';

describe('command center mission planning', () => {
  it('builds a seven-day mission queue from tenant pulse and trend signals', () => {
    const pulse: TenantSecurityPulse = {
      capturedAt: '2026-03-04T00:00:00.000Z',
      openTasks: 14,
      blockedTasks: 2,
      overdueTasks: 3,
      criticalTasks: 4,
      assessmentsInProgress: 2,
      expiringExceptionsNext7Days: 1,
      staleEvidenceOver90Days: 9,
      pendingEvidenceRequests: 3,
      trustInboxBacklog: 2,
      trustQuestionnairesAwaitingReview: 3,
      trustOverdueReviews: 2,
      openTrustFindings: 4,
      answerLibraryReuseCount: 9,
      trustPacketsCreated: 3,
      trustPacketsExported: 1,
      currentPostureScore: 68.4,
      postureDelta: -1.3,
      openTopRisks: 4,
      overdueRoadmapItems: 3,
      openAiReviews: 2,
      highRiskAiUseCases: 1,
      rejectedAiUseCases: 1,
      conditionalAiApprovalsPending: 1,
      aiVendorsPendingReview: 1,
      activeIncidents: 2,
      triageIncidents: 1,
      overdueIncidentActions: 2,
      openPostIncidentActions: 3,
      upcomingTabletops: 1,
      recentAfterActionReports: 1,
      latestPulseSnapshotId: 'snapshot-2',
      latestRoadmapId: 'roadmap-2',
      latestBoardBriefId: 'brief-2',
      latestQuarterlyReviewId: 'review-2'
    };

    const missionQueue = buildSevenDayMissionQueue(pulse, getTrendSignals());

    expect(missionQueue.length).toBeGreaterThanOrEqual(5);
    expect(missionQueue[0]?.priority).toBe('P0');
    expect(missionQueue.some((mission) => mission.id === 'identity-hardening-sprint')).toBe(true);
    expect(missionQueue.some((mission) => mission.id === 'trust-packet-refresh')).toBe(true);
    expect(missionQueue.every((mission) => mission.actions.length > 0)).toBe(true);
  });
});
