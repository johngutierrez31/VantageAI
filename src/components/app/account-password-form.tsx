'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  hasPassword: boolean;
};

export function AccountPasswordForm({ hasPassword }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error ?? 'Unable to update password.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setMessage(hasPassword ? 'Password updated successfully.' : 'Password set successfully.');
    } catch (error) {
      console.error('[account] password update failed', error);
      setMessage('Password update failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      {hasPassword ? (
        <Input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Current password"
          required
        />
      ) : null}
      <Input
        type="password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        placeholder="New password (min 10 chars)"
        minLength={10}
        required
      />
      <Button type="submit" disabled={busy}>
        {busy ? 'Saving...' : hasPassword ? 'Update Password' : 'Set Password'}
      </Button>
      <p className="text-xs text-muted-foreground">
        {hasPassword
          ? 'Use this to keep password access and avoid repeated magic-link sign-ins.'
          : 'Set a password now to enable normal sign-in from next time onward.'}
      </p>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
