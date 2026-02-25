import { LoginForm } from '@/components/login-form';
import Link from 'next/link';
import { isDemoModeEnabled } from '@/lib/auth/demo';

type Props = {
  searchParams?: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: Props) {
  const demoMode = isDemoModeEnabled();

  return (
    <div>
      {demoMode ? (
        <div className="card">
          Demo mode is enabled. You can open <Link href="/app/tools">/app/tools</Link> without logging in.
        </div>
      ) : null}
      {searchParams?.error === 'NoMembership' ? (
        <div className="card">No active tenant membership found for this account.</div>
      ) : null}
      <LoginForm />
    </div>
  );
}
