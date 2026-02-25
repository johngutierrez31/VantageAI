import { cookies } from 'next/headers';
import { AppShell } from '@/components/app/app-shell';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { isDemoModeEnabled } from '@/lib/auth/demo';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPageSessionContext();
  const initialFunMode = cookies().get('vantage_fun_mode')?.value === 'true';

  const activeUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true }
  });

  const searchItems = [
    {
      id: 'copilot',
      label: 'Copilot',
      description: 'Ask governance and security questions with citations.',
      href: '/app/copilot',
      kind: 'copilot' as const
    },
    {
      id: 'policy-generator',
      label: 'Policy Generator',
      description: 'Generate cybersecurity policies from curated templates',
      href: '/app/policies',
      kind: 'policy' as const
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
  }> = [];

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
