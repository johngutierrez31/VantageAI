'use client';

import { FormEvent, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => searchParams.get('callbackUrl') ?? '/app/templates', [searchParams]);
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
    <form className="card" onSubmit={onSubmit}>
      <h2>Sign in</h2>
      <p>Use your organization email. Access requires an active tenant membership.</p>
      <input
        type="email"
        value={email}
        placeholder="name@company.com"
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <button type="submit" disabled={loading}>{loading ? 'Sending link...' : 'Send magic link'}</button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
