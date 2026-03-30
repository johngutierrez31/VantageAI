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
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result =
        mode === 'password'
          ? await signIn('credentials', {
              email,
              password,
              callbackUrl,
              redirect: false
            })
          : await signIn('email', {
              email,
              callbackUrl,
              redirect: false
            });

      if (result?.error) {
        setMessage(
          mode === 'password'
            ? 'Sign-in failed. Check your email/password and workspace access.'
            : 'Sign-in failed. Confirm your email is part of an active tenant.'
        );
        return;
      }

      if (mode === 'password') {
        window.location.href = result?.url ?? callbackUrl;
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
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={mode === 'password' ? 'default' : 'outline'} onClick={() => setMode('password')}>
              Password
            </Button>
            <Button type="button" variant={mode === 'magic' ? 'default' : 'outline'} onClick={() => setMode('magic')}>
              Magic Link
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === 'password'
              ? 'Use your workspace email and password.'
              : 'Use your organization email to receive a secure sign-in link.'}
          </p>
          <Input
            type="email"
            value={email}
            placeholder="name@company.com"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {mode === 'password' ? (
            <Input
              type="password"
              value={password}
              placeholder="Password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          ) : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? mode === 'password'
                ? 'Signing in...'
                : 'Sending secure link...'
              : mode === 'password'
                ? 'Sign in'
                : 'Send secure sign-in link'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {mode === 'password'
              ? 'If you do not have a password yet, sign in once with Magic Link and set it from My Workspace.'
              : 'Magic links expire automatically and open the workspace assigned to your account.'}
          </p>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
