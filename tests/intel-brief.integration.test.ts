import { describe, expect, it } from 'vitest';
import { buildWeeklyBrief, renderWeeklyBriefHtml, renderWeeklyBriefMarkdown } from '../src/lib/intel/brief';
import { getTrendSignals } from '../src/lib/intel/trends';
import type { MissionPlanItem, TenantSecurityPulse } from '../src/lib/intel/pulse';

describe('weekly brief rendering', () => {
  it('builds markdown and html briefs from pulse and mission queue', () => {
    const pulse: TenantSecurityPulse = {
      capturedAt: '2026-03-04T00:00:00.000Z',
      openTasks: 10,
      blockedTasks: 1,
      overdueTasks: 2,
      criticalTasks: 3,
      assessmentsInProgress: 2,
      expiringExceptionsNext7Days: 1,
      staleEvidenceOver90Days: 4,
      pendingEvidenceRequests: 2,
      trustInboxBacklog: 1,
      trustQuestionnairesAwaitingReview: 2,
      trustOverdueReviews: 1,
      openTrustFindings: 3,
      answerLibraryReuseCount: 6,
      trustPacketsCreated: 2,
      trustPacketsExported: 1,
      currentPostureScore: 71.5,
      postureDelta: 4.2,
      openTopRisks: 3,
      overdueRoadmapItems: 2,
      openAiReviews: 1,
      highRiskAiUseCases: 1,
      rejectedAiUseCases: 0,
      conditionalAiApprovalsPending: 1,
      aiVendorsPendingReview: 1,
      activeIncidents: 1,
      triageIncidents: 1,
      overdueIncidentActions: 2,
      openPostIncidentActions: 3,
      upcomingTabletops: 1,
      recentAfterActionReports: 1,
      latestPulseSnapshotId: 'snapshot-1',
      latestRoadmapId: 'roadmap-1',
      latestBoardBriefId: 'brief-1',
      latestQuarterlyReviewId: 'review-1'
    };

    const missionQueue: MissionPlanItem[] = [
      {
        id: 'm1',
        day: 'Day 1',
        title: 'Close critical blockers',
        priority: 'P0',
        why: 'Critical tasks are open.',
        linkedRoute: '/app/findings',
        actions: ['Close blocker A', 'Close blocker B'],
        mappedTrendIds: ['identity-velocity']
      },
      {
        id: 'm2',
        day: 'Day 2',
        title: 'Identity hardening sprint',
        priority: 'P1',
        why: 'Identity trend pressure is high.',
        linkedRoute: '/app/security-analyst',
        actions: ['Review admin access'],
        mappedTrendIds: ['identity-velocity']
      }
    ];

    const brief = buildWeeklyBrief(pulse, getTrendSignals(), missionQueue);
    const markdown = renderWeeklyBriefMarkdown(brief);
    const html = renderWeeklyBriefHtml(brief);

    expect(brief.executiveSummary.length).toBeGreaterThan(20);
    expect(markdown).toContain('VantageCISO Weekly Brief');
    expect(markdown).toContain('Day 1 [P0] Close critical blockers');
    expect(html).toContain('<html');
    expect(html).toContain('Executive Summary');
    expect(html).toContain('Trend Radar');
  });
});
