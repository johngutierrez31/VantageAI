'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type ReviewerOption = {
  id: string;
  label: string;
};

type AnswerRow = {
  id: string;
  normalizedQuestion: string;
  questionText: string;
  answerText: string;
  scope: 'REUSABLE' | 'TENANT_SPECIFIC';
  status: 'ACTIVE' | 'ARCHIVED';
  usageCount: number;
  lastUsedAt: string | null;
  reviewedAt: string | null;
  ownerUserId: string | null;
  sourceQuestionnaireUpload?: {
    id: string;
    filename: string;
    organizationName: string | null;
  } | null;
  mappedControlIds: string[];
  supportingEvidenceIds: string[];
};

export function AnswerLibraryPanel({
  answers,
  reviewers
}: {
  answers: AnswerRow[];
  reviewers: ReviewerOption[];
}) {
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'REUSABLE' | 'TENANT_SPECIFIC'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [drafts, setDrafts] = useState<Record<string, Partial<AnswerRow>>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return answers.filter((answer) => {
      if (scopeFilter !== 'ALL' && answer.scope !== scopeFilter) return false;
      if (statusFilter !== 'ALL' && answer.status !== statusFilter) return false;
      if (!needle) return true;
      return [answer.normalizedQuestion, answer.questionText, answer.answerText]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [answers, scopeFilter, search, statusFilter]);

  async function save(answer: AnswerRow) {
    const draft = drafts[answer.id] ?? {};
    setBusyId(answer.id);
    setMessage(null);
    const response = await fetch(`/api/answer-library/${answer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionText: draft.questionText ?? answer.questionText,
        answerText: draft.answerText ?? answer.answerText,
        scope: draft.scope ?? answer.scope,
        status: draft.status ?? answer.status,
        ownerUserId:
          draft.ownerUserId === undefined ? answer.ownerUserId : draft.ownerUserId
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusyId(null);
    if (!response.ok) {
      setMessage(payload.error ?? 'Failed to update answer library entry');
      return;
    }

    setMessage('Answer library updated. Refresh to load the latest metadata.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Answer Library"
        description="Govern reusable buyer responses, track reuse, and curate which approved answers become durable TrustOps assets."
        secondaryActions={[
          { label: 'TrustOps', href: '/app/trust', variant: 'outline' },
          { label: 'Review Queue', href: '/app/trust/reviews', variant: 'outline' }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Library Controls</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions or answers" />
          <Select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as typeof scopeFilter)}>
            <option value="ALL">All scopes</option>
            <option value="REUSABLE">Reusable</option>
            <option value="TENANT_SPECIFIC">Tenant specific</option>
          </Select>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
          {message ? <p className="md:col-span-3 text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No answer-library entries match the current filters.</CardContent>
          </Card>
        ) : (
          filtered.map((answer) => {
            const draft = drafts[answer.id] ?? {};
            return (
              <Card key={answer.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{answer.questionText}</CardTitle>
                      <p className="text-xs text-muted-foreground">Normalized: {answer.normalizedQuestion}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={answer.scope} />
                      <StatusPill status={answer.status} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Usage Count</p>
                      <p className="text-2xl font-semibold">{answer.usageCount}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Used</p>
                      <p className="text-sm font-medium">
                        {answer.lastUsedAt ? new Date(answer.lastUsedAt).toLocaleString() : 'Not reused yet'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Reviewed</p>
                      <p className="text-sm font-medium">
                        {answer.reviewedAt ? new Date(answer.reviewedAt).toLocaleString() : 'Review metadata unavailable'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p>
                      <p className="text-sm font-medium">
                        {answer.sourceQuestionnaireUpload?.filename ?? 'Questionnaire review queue'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Question</p>
                      <Input
                        value={draft.questionText ?? answer.questionText}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [answer.id]: {
                              ...current[answer.id],
                              questionText: event.target.value
                            }
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner</p>
                      <Select
                        value={draft.ownerUserId ?? answer.ownerUserId ?? ''}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [answer.id]: {
                              ...current[answer.id],
                              ownerUserId: event.target.value || null
                            }
                          }))
                        }
                      >
                        <option value="">Unassigned</option>
                        {reviewers.map((reviewer) => (
                          <option key={reviewer.id} value={reviewer.id}>
                            {reviewer.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Approved Answer</p>
                    <textarea
                      className="min-h-[140px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={draft.answerText ?? answer.answerText}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [answer.id]: {
                            ...current[answer.id],
                            answerText: event.target.value
                          }
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-[220px_220px_1fr]">
                    <Select
                      value={draft.scope ?? answer.scope}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [answer.id]: {
                            ...current[answer.id],
                            scope: event.target.value as AnswerRow['scope']
                          }
                        }))
                      }
                    >
                      <option value="REUSABLE">Reusable</option>
                      <option value="TENANT_SPECIFIC">Tenant specific</option>
                    </Select>
                    <Select
                      value={draft.status ?? answer.status}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [answer.id]: {
                            ...current[answer.id],
                            status: event.target.value as AnswerRow['status']
                          }
                        }))
                      }
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="ARCHIVED">Archived</option>
                    </Select>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{answer.mappedControlIds.length} control link(s)</span>
                      <span>{answer.supportingEvidenceIds.length} evidence link(s)</span>
                      {answer.sourceQuestionnaireUpload?.organizationName ? (
                        <span>Buyer: {answer.sourceQuestionnaireUpload.organizationName}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => save(answer)} disabled={busyId === answer.id}>
                      {busyId === answer.id ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
