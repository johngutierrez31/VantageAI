'use client';

import { FormEvent, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => searchParams.get('callbackUrl') ?? '/app/command-center', [searchParams]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await signIn('email', {
        email,
        callbackUrl,
        redirect: false
      });

      if (result?.error) {
        setMessage('Sign-in failed. Confirm your email is part of an active tenant.');
        return;
      }

      setMessage('Magic link sent. Check your inbox for the sign-in link.');
    } catch (error) {
      console.error('[auth] signIn request failed', error);
      setMessage('Sign-in request failed. Check server logs and your .env configuration.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Sign in to an existing workspace
          </CardTitle>
        </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <p className="text-sm text-muted-foreground">
            Use your organization email. Access is tenant-scoped and requires an active membership.
          </p>
          <Input
            type="email"
            value={email}
            placeholder="name@company.com"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending secure link...' : 'Send secure sign-in link'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Magic links expire automatically and open the workspace assigned to your account.
          </p>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
