'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill } from '@/components/app/status-pill';

type ExceptionItem = {
  id: string;
  assessmentId: string;
  controlCode: string;
  reason: string;
  owner: string | null;
  approver: string | null;
  dueDate: string | null;
  status: 'OPEN' | 'ACCEPTED' | 'CLOSED';
};

type Props = {
  assessmentId: string;
  exceptions: ExceptionItem[];
};

export function ExceptionsPanel({ assessmentId, exceptions: initial }: Props) {
  const [exceptions, setExceptions] = useState(initial);
  const [controlCode, setControlCode] = useState('');
  const [reason, setReason] = useState('');
  const [owner, setOwner] = useState('');
  const [approver, setApprover] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createException(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch('/api/exceptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId,
        controlCode,
        reason,
        owner: owner || undefined,
        approver: approver || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined
      })
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to create exception');
      return;
    }
    setExceptions((prev) => [payload, ...prev]);
    setControlCode('');
    setReason('');
    setOwner('');
    setApprover('');
    setDueDate('');
  }

  async function updateStatus(exceptionId: string, status: ExceptionItem['status']) {
    const response = await fetch(`/api/exceptions/${exceptionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) return;
    const updated = await response.json();
    setExceptions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exception Governance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={createException} className="grid gap-2 md:grid-cols-2">
          <Input placeholder="Control code" value={controlCode} onChange={(event) => setControlCode(event.target.value)} required />
          <Input placeholder="Owner" value={owner} onChange={(event) => setOwner(event.target.value)} />
          <Input
            placeholder="Approver (required)"
            value={approver}
            onChange={(event) => setApprover(event.target.value)}
            required
          />
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
          <div className="md:col-span-2">
            <Textarea rows={2} placeholder="Reason for accepted risk" value={reason} onChange={(event) => setReason(event.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Create accepted risk exception'}</Button>
          </div>
          <p className="md:col-span-2 text-xs text-muted-foreground">
            Accepted risk requires reason, approver, and expiry date.
          </p>
          {message ? <p className="md:col-span-2 text-sm text-danger">{message}</p> : null}
        </form>

        <div className="space-y-2">
          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exceptions yet.</p>
          ) : (
            exceptions.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{item.controlCode}</p>
                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Owner: {item.owner ?? 'Unassigned'} - Approver: {item.approver ?? 'Not set'} - Expires:{' '}
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No date'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={item.status} />
                  <Select
                    value={item.status}
                    onChange={(event) => updateStatus(item.id, event.target.value as ExceptionItem['status'])}
                    className="h-8 w-[140px]"
                  >
                    <option value="OPEN">Open</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="CLOSED">Closed</option>
                  </Select>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
