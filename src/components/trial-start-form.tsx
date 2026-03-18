'use client';

import { FormEvent, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function TrialStartForm() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => searchParams.get('callbackUrl') ?? '/app/command-center?welcome=trial', [searchParams]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch('/api/trial/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceName,
          email
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(payload.error ?? 'Unable to start the trial workspace.');
        setBusy(false);
        return;
      }

      const signInResult = await signIn('email', {
        email,
        callbackUrl,
        redirect: false
      });

      if (signInResult?.error) {
        setMessage('Trial workspace created, but the secure sign-in link could not be sent automatically.');
        setBusy(false);
        return;
      }

      setMessage('Your 14-day trial workspace is ready. Check your inbox for the secure sign-in link.');
    } catch (error) {
      console.error('[trial] start request failed', error);
      setMessage('Trial provisioning failed. Check server logs and local configuration.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Start a 14-day full-access trial
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <p className="text-sm text-muted-foreground">
            Create a brand-new blank workspace with full suite access. Demo data is not added to trial workspaces.
          </p>
          <Input
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Workspace name"
            required
          />
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            required
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Creating trial workspace...' : 'Start 14-day trial'}
          </Button>
          <p className="text-xs text-muted-foreground">
            You will receive a magic link and land in your new blank workspace.
          </p>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
