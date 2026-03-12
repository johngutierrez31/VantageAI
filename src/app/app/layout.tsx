import { cookies } from 'next/headers';
import { AppShell } from '@/components/app/app-shell';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { isDemoModeEnabled } from '@/lib/auth/demo';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import { getTenantSecurityPulse } from '@/lib/intel/pulse';
import { FUN_MODE_COOKIE } from '@/lib/ui/fun-mode';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPageSessionContext();
  const initialFunMode = cookies().get(FUN_MODE_COOKIE)?.value === 'true';

  const [activeUser, pulse, entitlements] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, name: true }
    }),
    getTenantSecurityPulse(session.tenantId),
    getTenantEntitlements(session.tenantId)
  ]);

  const searchItems = [
    {
      id: 'command-center',
      label: 'Command Center',
      description: 'Suite-wide mission queue, module carry-over, and leadership-ready security priorities.',
      href: '/app/command-center',
      kind: 'command' as const
    },
    {
      id: 'tools-hub',
      label: 'Tools Hub',
      description: 'Module launcher and guided workflow map across TrustOps, Pulse, AI Governance, and Response Ops.',
      href: '/app/tools',
      kind: 'tools' as const
    },
    {
      id: 'pulse',
      label: 'Pulse',
      description: 'Executive scorecards, risk register, roadmap, board briefs, and quarterly reviews.',
      href: '/app/pulse',
      kind: 'pulse' as const
    },
    {
      id: 'pulse-risks',
      label: 'Risk Register',
      description: 'Living executive risk register built from findings, tasks, and trust gaps.',
      href: '/app/pulse/risks',
      kind: 'risk' as const
    },
    {
      id: 'pulse-roadmap',
      label: 'Pulse Roadmap',
      description: '30/60/90 remediation roadmap tied to current scorecards and risks.',
      href: '/app/pulse/roadmap',
      kind: 'roadmap' as const
    },
    {
      id: 'ai-governance',
      label: 'AI Governance',
      description: 'AI use case registry, vendor intake, policy mapping, and review queue.',
      href: '/app/ai-governance',
      kind: 'ai' as const
    },
    {
      id: 'response-ops',
      label: 'Response Ops',
      description: 'Incident triage, runbook packs, after-action reviews, tabletop workflows, and operational hooks into Pulse.',
      href: '/app/response-ops',
      kind: 'responseops' as const
    },
    {
      id: 'response-ops-incidents',
      label: 'Incident Triage',
      description: 'Create and manage durable incident records, first-hour triage, timeline events, and runbook packs.',
      href: '/app/response-ops',
      kind: 'incident' as const
    },
    {
      id: 'response-ops-tabletops',
      label: 'Tabletop Exercises',
      description: 'Prepare and complete lightweight response exercises that create follow-up tasks, findings, and risks.',
      href: '/app/response-ops',
      kind: 'tabletop' as const
    },
    {
      id: 'ai-use-cases',
      label: 'AI Use Cases',
      description: 'Register, review, and update governed AI workflows and approvals.',
      href: '/app/ai-governance/use-cases',
      kind: 'ai' as const
    },
    {
      id: 'ai-vendors',
      label: 'AI Vendor Intake',
      description: 'Review AI vendors for retention, training behavior, logging, and approval conditions.',
      href: '/app/ai-governance/vendors',
      kind: 'vendor' as const
    },
    {
      id: 'ai-reviews',
      label: 'AI Review Queue',
      description: 'Assign reviewers, set due dates, and manage overdue AI governance decisions.',
      href: '/app/ai-governance/reviews',
      kind: 'review' as const
    },
    {
      id: 'trustops',
      label: 'TrustOps',
      description: 'Buyer diligence operations, evidence linking, trust packets, and procurement response workflows.',
      href: '/app/trust',
      kind: 'trustops' as const
    },
    {
      id: 'questionnaires',
      label: 'Questionnaires',
      description: 'Import, draft, review, and export approved questionnaire answers.',
      href: '/app/questionnaires',
      kind: 'questionnaire' as const
    },
    {
      id: 'review-queue',
      label: 'TrustOps Review Queue',
      description: 'Assign reviewers, set due dates, and manage TrustOps SLA risk.',
      href: '/app/trust/reviews',
      kind: 'review' as const
    },
    {
      id: 'answer-library',
      label: 'Answer Library',
      description: 'Curate reusable buyer-safe answers, ownership, and reuse metrics.',
      href: '/app/trust/answer-library',
      kind: 'library' as const
    },
    {
      id: 'copilot',
      label: 'Copilot',
      description: 'Ask governance and security questions with citations.',
      href: '/app/copilot',
      kind: 'copilot' as const
    },
    {
      id: 'security-analyst',
      label: 'Security Analyst',
      description: 'Run structured threat, incident, and vulnerability analysis.',
      href: '/app/security-analyst',
      kind: 'analyst' as const
    },
    {
      id: 'runbooks',
      label: 'Runbooks',
      description: 'Instantiate prebuilt incident and resilience task packs.',
      href: '/app/runbooks',
      kind: 'runbook' as const
    },
    {
      id: 'policy-generator',
      label: 'Policies',
      description: 'Generate and review cybersecurity policy artifacts from curated templates.',
      href: '/app/policies',
      kind: 'policy' as const
    },
    {
      id: 'cyber-range',
      label: 'Cyber Range',
      description: 'Design phased cyber range architectures and runbooks.',
      href: '/app/cyber-range',
      kind: 'range' as const
    },
    {
      id: 'settings-members',
      label: 'Settings: Members',
      description: 'Manage workspace members and roles.',
      href: '/app/settings/members',
      kind: 'settings' as const
    },
    {
      id: 'settings-billing',
      label: 'Settings: Billing',
      description: 'Manage plan and billing details.',
      href: '/app/settings/billing',
      kind: 'settings' as const
    }
  ];

  const notifications: Array<{
    id: string;
    title: string;
    detail: string;
    href?: string;
  }> = [
    ...(pulse.criticalTasks > 0
      ? [
          {
            id: 'critical-tasks',
            title: 'Critical remediation work is open',
            detail: `${pulse.criticalTasks} critical task(s) require attention.`,
            href: '/app/findings'
          }
        ]
      : []),
    ...(pulse.expiringExceptionsNext7Days > 0
      ? [
          {
            id: 'expiring-exceptions',
            title: 'Exceptions expiring soon',
            detail: `${pulse.expiringExceptionsNext7Days} exception(s) expire within seven days.`,
            href: '/app/findings'
          }
        ]
      : []),
    ...(pulse.pendingEvidenceRequests > 0
      ? [
          {
            id: 'evidence-requests',
            title: 'Pending evidence requests',
            detail: `${pulse.pendingEvidenceRequests} evidence request(s) still pending.`,
            href: '/app/evidence'
          }
        ]
      : []),
    ...(pulse.trustInboxBacklog > 0
      ? [
          {
            id: 'trust-inbox',
            title: 'Trust inbox backlog',
            detail: `${pulse.trustInboxBacklog} trust item(s) waiting in inbox.`,
            href: '/app/trust/inbox'
          }
        ]
      : []),
    ...(pulse.trustOverdueReviews > 0
      ? [
          {
            id: 'trust-overdue-reviews',
            title: 'TrustOps reviews are overdue',
            detail: `${pulse.trustOverdueReviews} review item(s) are past SLA.`,
            href: '/app/trust/reviews'
          }
        ]
      : []),
    ...(pulse.openTopRisks > 0
      ? [
          {
            id: 'pulse-top-risks',
            title: 'Pulse risks need executive attention',
            detail: `${pulse.openTopRisks} high or critical risk register item(s) remain open.`,
            href: '/app/pulse/risks'
          }
        ]
      : []),
    ...(pulse.overdueRoadmapItems > 0
      ? [
          {
            id: 'pulse-roadmap-overdue',
            title: 'Pulse roadmap items are overdue',
            detail: `${pulse.overdueRoadmapItems} roadmap item(s) are past target date.`,
            href: '/app/pulse/roadmap'
          }
        ]
      : []),
    ...(pulse.openAiReviews > 0
      ? [
          {
            id: 'ai-open-reviews',
            title: 'AI Governance reviews need attention',
            detail: `${pulse.openAiReviews} AI review item(s) are still open.`,
            href: '/app/ai-governance/reviews'
          }
        ]
      : []),
    ...(pulse.activeIncidents > 0
      ? [
          {
            id: 'response-active-incidents',
            title: 'Response Ops incidents are active',
            detail: `${pulse.activeIncidents} incident(s) are open and ${pulse.triageIncidents} remain in triage.`,
            href: '/app/response-ops'
          }
        ]
      : []),
    ...(pulse.overdueIncidentActions > 0
      ? [
          {
            id: 'response-overdue-actions',
            title: 'Incident actions are overdue',
            detail: `${pulse.overdueIncidentActions} incident-linked task(s) are past due.`,
            href: '/app/response-ops'
          }
        ]
      : []),
    ...(pulse.highRiskAiUseCases > 0
      ? [
          {
            id: 'ai-high-risk',
            title: 'High-risk AI workflows are active',
            detail: `${pulse.highRiskAiUseCases} AI use case(s) or vendor review(s) are high risk.`,
            href: '/app/ai-governance'
          }
        ]
      : []),
    ...(pulse.openTrustFindings > 0
      ? [
          {
            id: 'trust-findings',
            title: 'TrustOps findings remain open',
            detail: `${pulse.openTrustFindings} finding(s) need remediation or evidence updates.`,
            href: '/app/findings'
          }
        ]
      : [])
  ];

  return (
    <AppShell
      tenantName={session.tenantName}
      tenantId={session.tenantId}
      memberships={session.memberships}
      role={session.role}
      demoMode={isDemoModeEnabled()}
      userLabel={activeUser?.name ?? activeUser?.email ?? session.userId}
      searchItems={searchItems}
      notifications={notifications}
      currentPlan={entitlements.plan}
      initialFunMode={initialFunMode}
    >
      {children}
    </AppShell>
  );
}
