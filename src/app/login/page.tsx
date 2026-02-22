import { LoginForm } from '@/components/login-form';

type Props = {
  searchParams?: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: Props) {
  return (
    <div>
      {searchParams?.error === 'NoMembership' ? (
        <div className="card">No active tenant membership found for this account.</div>
      ) : null}
      <LoginForm />
    </div>
  );
}
