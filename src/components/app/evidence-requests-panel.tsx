'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill } from '@/components/app/status-pill';

type EvidenceRequestItem = {
  id: string;
  assessmentId: string | null;
  title: string;
  details: string | null;
  assignee: string | null;
  status: 'REQUESTED' | 'RECEIVED' | 'COMPLETE';
  dueDate: string | null;
};

type Props = {
  assessmentId?: string;
  requests: EvidenceRequestItem[];
};

export function EvidenceRequestsPanel({ assessmentId, requests: initial }: Props) {
  const [requests, setRequests] = useState(initial);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);

  async function createRequest(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch('/api/evidence/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId,
        title,
        details: details || undefined,
        assignee: assignee || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined
      })
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return;
    setRequests((prev) => [payload, ...prev]);
    setTitle('');
    setDetails('');
    setAssignee('');
    setDueDate('');
  }

  async function updateStatus(requestId: string, status: EvidenceRequestItem['status']) {
    const response = await fetch(`/api/evidence/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) return;
    const updated = await response.json();
    setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={createRequest} className="grid gap-2 md:grid-cols-2">
          <Input placeholder="Request title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <Input placeholder="Assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} />
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <div className="md:col-span-2">
            <Textarea rows={2} placeholder="Request details" value={details} onChange={(event) => setDetails(event.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>{busy ? 'Requesting...' : 'Create evidence request'}</Button>
          </div>
        </form>

        <div className="space-y-2">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Evidence Requests is for chasing missing artifacts with ownership and due dates. Create one request to produce a durable collection record that can feed assessments, TrustOps review, and future packet refreshes.
            </p>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{request.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.assignee ? `Assignee: ${request.assignee}` : 'Unassigned'}
                      {request.dueDate ? ` - Due ${new Date(request.dueDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={request.status} />
                    <Select
                      value={request.status}
                      onChange={(event) => updateStatus(request.id, event.target.value as EvidenceRequestItem['status'])}
                      className="h-8 w-[140px]"
                    >
                      <option value="REQUESTED">Requested</option>
                      <option value="RECEIVED">Received</option>
                      <option value="COMPLETE">Complete</option>
                    </Select>
                  </div>
                </div>
                {request.details ? <p className="mt-2 text-sm text-muted-foreground">{request.details}</p> : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
