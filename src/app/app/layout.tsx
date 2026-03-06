import { cookies } from 'next/headers';
import { AppShell } from '@/components/app/app-shell';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { isDemoModeEnabled } from '@/lib/auth/demo';
import { getTenantSecurityPulse } from '@/lib/intel/pulse';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPageSessionContext();
  const initialFunMode = cookies().get('vantage_fun_mode')?.value === 'true';

  const [activeUser, pulse] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, name: true }
    }),
    getTenantSecurityPulse(session.tenantId)
  ]);

  const searchItems = [
    {
      id: 'command-center',
      label: 'Command Center',
      description: 'Daily solo-CISO mission queue and threat trend radar.',
      href: '/app/command-center',
      kind: 'command' as const
    },
    {
      id: 'tools-hub',
      label: 'Tools Hub',
      description: 'Central launcher and workflow map across core security tools.',
      href: '/app/tools',
      kind: 'tools' as const
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
      label: 'Policy Generator',
      description: 'Generate cybersecurity policies from curated templates',
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
      initialFunMode={initialFunMode}
    >
      {children}
    </AppShell>
  );
}
