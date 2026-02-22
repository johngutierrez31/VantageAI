import './globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { SessionNav } from '@/components/session-nav';

export const metadata = {
  title: 'VantageCISO',
  description: 'Assessment and AI readiness SaaS MVP'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <main>
          <SessionNav
            isAuthenticated={Boolean(session?.user)}
            activeTenantName={session?.user?.activeTenantName}
            role={session?.user?.role}
            memberships={session?.user?.memberships}
          />
          {children}
        </main>
      </body>
    </html>
  );
}
