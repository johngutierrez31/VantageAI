import './globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { SessionNav } from '@/components/session-nav';
import { getSessionContext } from '@/lib/auth/session';
import { isDemoModeEnabled } from '@/lib/auth/demo';

export const metadata = {
  title: 'VantageCISO',
  description: 'Assessment and AI readiness SaaS MVP'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const demoMode = isDemoModeEnabled();

  let demoSessionContext: Awaited<ReturnType<typeof getSessionContext>> | null = null;
  if (demoMode && !session?.user) {
    try {
      demoSessionContext = await getSessionContext();
    } catch {
      demoSessionContext = null;
    }
  }

  return (
    <html lang="en">
      <body>
        <main>
          <SessionNav
            isAuthenticated={Boolean(session?.user) || Boolean(demoSessionContext)}
            activeTenantName={session?.user?.activeTenantName ?? demoSessionContext?.tenantName}
            role={session?.user?.role ?? demoSessionContext?.role}
            memberships={session?.user?.memberships ?? demoSessionContext?.memberships}
            demoMode={demoMode && !session?.user}
          />
          {children}
        </main>
      </body>
    </html>
  );
}
