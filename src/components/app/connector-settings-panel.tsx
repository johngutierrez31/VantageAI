'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  CONNECTOR_PROVIDER_CAPABILITIES,
  CONNECTOR_PROVIDER_LABELS,
  CONNECTOR_PROVIDER_ORDER
} from '@/lib/integrations/catalog';

type Provider = keyof typeof CONNECTOR_PROVIDER_LABELS;

type ConnectorView = {
  id: string;
  provider: Provider;
  name: string;
  description: string | null;
  mode: 'SIMULATED' | 'LIVE';
  status: 'ACTIVE' | 'NEEDS_ATTENTION' | 'DISABLED';
  configJson: Record<string, unknown>;
  hasSecrets: boolean;
  secretFields: string[];
  lastHealthStatus: string | null;
  lastHealthCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  activities: Array<{
    id: string;
    action: string;
    status: string;
    summary: string;
    targetLabel: string | null;
    externalObjectKey: string | null;
    externalObjectUrl: string | null;
    createdAt: string;
    errorMessage: string | null;
  }>;
  objectLinks: Array<{
    id: string;
    entityType: string;
    entityId: string;
    externalObjectId: string;
    externalObjectKey: string | null;
    externalObjectUrl: string | null;
    lastSyncStatus: string;
    lastSyncedAt: string | null;
  }>;
};

type SyncTarget = {
  entityType: 'finding' | 'risk' | 'task' | 'roadmap_item';
  id: string;
  title: string;
  status: string;
  helper: string;
};

type PublishTarget = {
  artifactType: 'trust_packet' | 'board_brief' | 'after_action_report' | 'quarterly_review';
  id: string;
  title: string;
  helper: string;
};

type ConnectorFormState = {
  id?: string;
  provider: Provider;
  name: string;
  description: string;
  mode: 'SIMULATED' | 'LIVE';
  status: 'ACTIVE' | 'NEEDS_ATTENTION' | 'DISABLED';
  enabledEventKeys: string;
  defaultChannel: string;
  webhookUrl: string;
  jiraBaseUrl: string;
  jiraProjectKey: string;
  jiraIssueType: string;
  jiraEmail: string;
  jiraApiToken: string;
  statusMappings: string;
  confluenceBaseUrl: string;
  confluenceSpaceKey: string;
  confluenceParentPageId: string;
  confluenceEmail: string;
  confluenceApiToken: string;
  googleDriveFolderId: string;
  googleServiceAccountJson: string;
  outboundWebhookUrl: string;
  outboundWebhookSecret: string;
};

function commaSeparatedToArray(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function statusMappingTextToArray(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [source, target] = line.split('=>').map((entry) => entry.trim());
      return source && target ? { source, target } : null;
    })
    .filter((entry): entry is { source: string; target: string } => Boolean(entry));
}

function buildInitialForm(provider: Provider, connector?: ConnectorView): ConnectorFormState {
  const config = connector?.configJson ?? {};
  const stringifyMappings = Array.isArray(config.statusMappings)
    ? (config.statusMappings as Array<{ source?: string; target?: string }>)
        .map((entry) => (entry.source && entry.target ? `${entry.source} => ${entry.target}` : ''))
        .filter(Boolean)
        .join('\n')
    : '';

  return {
    id: connector?.id,
    provider,
    name: connector?.name ?? `${CONNECTOR_PROVIDER_LABELS[provider]} Connector`,
    description: connector?.description ?? CONNECTOR_PROVIDER_CAPABILITIES[provider].summary,
    mode: connector?.mode ?? 'SIMULATED',
    status: connector?.status ?? 'ACTIVE',
    enabledEventKeys: Array.isArray(config.enabledEventKeys) ? (config.enabledEventKeys as string[]).join(', ') : '',
    defaultChannel: typeof config.defaultChannel === 'string' ? config.defaultChannel : '',
    webhookUrl: '',
    jiraBaseUrl: typeof config.jiraBaseUrl === 'string' ? config.jiraBaseUrl : '',
    jiraProjectKey: typeof config.jiraProjectKey === 'string' ? config.jiraProjectKey : '',
    jiraIssueType: typeof config.jiraIssueType === 'string' ? config.jiraIssueType : 'Task',
    jiraEmail: typeof config.jiraEmail === 'string' ? config.jiraEmail : '',
    jiraApiToken: '',
    statusMappings: stringifyMappings,
    confluenceBaseUrl: typeof config.confluenceBaseUrl === 'string' ? config.confluenceBaseUrl : '',
    confluenceSpaceKey: typeof config.confluenceSpaceKey === 'string' ? config.confluenceSpaceKey : '',
    confluenceParentPageId: typeof config.confluenceParentPageId === 'string' ? config.confluenceParentPageId : '',
    confluenceEmail: typeof config.confluenceEmail === 'string' ? config.confluenceEmail : '',
    confluenceApiToken: '',
    googleDriveFolderId: typeof config.googleDriveFolderId === 'string' ? config.googleDriveFolderId : '',
    googleServiceAccountJson: '',
    outboundWebhookUrl: typeof config.outboundWebhookUrl === 'string' ? config.outboundWebhookUrl : '',
    outboundWebhookSecret: ''
  };
}

export function ConnectorSettingsPanel({
  connectors,
  syncTargets,
  publishTargets
}: {
  connectors: ConnectorView[];
  syncTargets: SyncTarget[];
  publishTargets: PublishTarget[];
}) {
  const connectorMap = useMemo(
    () => new Map(connectors.map((connector) => [connector.provider, connector])),
    [connectors]
  );

  const [forms, setForms] = useState<Record<string, ConnectorFormState>>(() =>
    Object.fromEntries(
      CONNECTOR_PROVIDER_ORDER.map((provider) => [provider, buildInitialForm(provider, connectorMap.get(provider))])
    )
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [slackNotify, setSlackNotify] = useState({
    connectorId: connectors.find((connector) => connector.provider === 'SLACK')?.id ?? '',
    eventKey: 'manual_notification',
    title: 'Quarterly review ready for leadership',
    body: 'Pulse prepared the latest leadership packet and linked next steps.',
    href: '/app/pulse'
  });
  const [jiraSync, setJiraSync] = useState({
    connectorId: connectors.find((connector) => connector.provider === 'JIRA')?.id ?? '',
    entityType: syncTargets[0]?.entityType ?? 'finding',
    entityId: syncTargets[0]?.id ?? ''
  });
  const [docPublish, setDocPublish] = useState({
    connectorId: connectors.find((connector) => connector.provider === 'CONFLUENCE')?.id ?? connectors.find((connector) => connector.provider === 'GOOGLE_DRIVE')?.id ?? '',
    artifactType: publishTargets[0]?.artifactType ?? 'trust_packet',
    artifactId: publishTargets[0]?.id ?? ''
  });

  function updateForm(provider: Provider, patch: Partial<ConnectorFormState>) {
    setForms((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        ...patch
      }
    }));
  }

  async function saveConnector(provider: Provider) {
    const form = forms[provider];
    setBusyKey(`save-${provider}`);
    setMessage(null);

    const payload = {
      ...form,
      enabledEventKeys: commaSeparatedToArray(form.enabledEventKeys),
      statusMappings: statusMappingTextToArray(form.statusMappings)
    };

    const response = await fetch('/api/integrations/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    setBusyKey(null);

    if (!response.ok) {
      setMessage(result.error ?? `Failed to save ${CONNECTOR_PROVIDER_LABELS[provider]} connector`);
      return;
    }

    setMessage(`${CONNECTOR_PROVIDER_LABELS[provider]} connector saved.`);
    window.location.reload();
  }

  async function runHealthCheck(connectorId: string, provider: Provider) {
    setBusyKey(`health-${provider}`);
    setMessage(null);
    const response = await fetch(`/api/integrations/connectors/${connectorId}/health`, {
      method: 'POST'
    });
    const result = await response.json().catch(() => ({}));
    setBusyKey(null);

    if (!response.ok) {
      setMessage(result.error ?? `Failed to test ${CONNECTOR_PROVIDER_LABELS[provider]} connector`);
      return;
    }

    setMessage(result.summary ?? `${CONNECTOR_PROVIDER_LABELS[provider]} health check completed.`);
    window.location.reload();
  }

  async function sendSlack() {
    setBusyKey('slack-notify');
    setMessage(null);
    const response = await fetch('/api/integrations/slack/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackNotify)
    });
    const result = await response.json().catch(() => ({}));
    setBusyKey(null);
    setMessage(response.ok ? result.summary ?? 'Slack notification sent.' : result.error ?? 'Slack send failed.');
    if (response.ok) window.location.reload();
  }

  async function syncJira() {
    setBusyKey('jira-sync');
    setMessage(null);
    const response = await fetch('/api/integrations/jira/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jiraSync)
    });
    const result = await response.json().catch(() => ({}));
    setBusyKey(null);
    setMessage(response.ok ? result.summary ?? 'Jira sync completed.' : result.error ?? 'Jira sync failed.');
    if (response.ok) window.location.reload();
  }

  async function publishDoc() {
    setBusyKey('doc-publish');
    setMessage(null);
    const response = await fetch('/api/integrations/docs/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docPublish)
    });
    const result = await response.json().catch(() => ({}));
    setBusyKey(null);
    setMessage(response.ok ? result.summary ?? 'Document publish completed.' : result.error ?? 'Document publish failed.');
    if (response.ok) window.location.reload();
  }

  const selectedSyncTarget =
    syncTargets.find((target) => target.entityType === jiraSync.entityType && target.id === jiraSync.entityId) ?? null;
  const selectedPublishTarget =
    publishTargets.find((target) => target.artifactType === docPublish.artifactType && target.id === docPublish.artifactId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connector Health"
        helpKey="toolsHub"
        description="Configure tenant-scoped connectors, keep delivery health visible, and push high-value work into the systems your team already uses."
        primaryAction={{ label: 'Open Tools Hub', href: '/app/tools' }}
        secondaryActions={[
          { label: 'Members', href: '/app/settings/members', variant: 'outline' },
          { label: 'Billing', href: '/app/settings/billing', variant: 'outline' }
        ]}
      >
        <p className="text-xs text-muted-foreground">
          Live connectors are safe and narrow. Simulated mode is available for demo tenants and validation runs when external credentials are intentionally absent.
        </p>
      </PageHeader>

      {message ? (
        <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">{message}</div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {CONNECTOR_PROVIDER_ORDER.map((provider) => {
          const connector = connectorMap.get(provider);
          const capability = CONNECTOR_PROVIDER_CAPABILITIES[provider];
          const form = forms[provider];

          return (
            <Card key={provider}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{CONNECTOR_PROVIDER_LABELS[provider]}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-border px-2 py-0.5 text-[11px] font-medium">
                      {capability.status === 'live' ? 'Live Pattern' : 'Scaffolded'}
                    </span>
                    <StatusPill status={connector?.status ?? 'DRAFT'} />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{capability.summary}</p>
                <Input
                  value={form.name}
                  onChange={(event) => updateForm(provider, { name: event.target.value })}
                  placeholder={`${CONNECTOR_PROVIDER_LABELS[provider]} connector name`}
                />
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(event) => updateForm(provider, { description: event.target.value })}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Select value={form.mode} onChange={(event) => updateForm(provider, { mode: event.target.value as ConnectorFormState['mode'] })}>
                    <option value="SIMULATED">Simulated</option>
                    <option value="LIVE">Live</option>
                  </Select>
                  <Select value={form.status} onChange={(event) => updateForm(provider, { status: event.target.value as ConnectorFormState['status'] })}>
                    <option value="ACTIVE">Active</option>
                    <option value="NEEDS_ATTENTION">Needs attention</option>
                    <option value="DISABLED">Disabled</option>
                  </Select>
                </div>

                {(provider === 'SLACK' || provider === 'OUTBOUND_WEBHOOK') ? (
                  <Textarea
                    rows={2}
                    value={form.enabledEventKeys}
                    onChange={(event) => updateForm(provider, { enabledEventKeys: event.target.value })}
                    placeholder="Enabled events, comma separated"
                  />
                ) : null}

                {provider === 'SLACK' ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={form.defaultChannel}
                      onChange={(event) => updateForm(provider, { defaultChannel: event.target.value })}
                      placeholder="#security-ops"
                    />
                    <Input
                      value={form.webhookUrl}
                      onChange={(event) => updateForm(provider, { webhookUrl: event.target.value })}
                      placeholder={connector?.hasSecrets ? 'Webhook saved. Paste to rotate.' : 'Slack webhook URL'}
                    />
                  </div>
                ) : null}

                {provider === 'JIRA' ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={form.jiraBaseUrl}
                        onChange={(event) => updateForm(provider, { jiraBaseUrl: event.target.value })}
                        placeholder="https://company.atlassian.net"
                      />
                      <Input
                        value={form.jiraProjectKey}
                        onChange={(event) => updateForm(provider, { jiraProjectKey: event.target.value })}
                        placeholder="SEC"
                      />
                      <Input
                        value={form.jiraIssueType}
                        onChange={(event) => updateForm(provider, { jiraIssueType: event.target.value })}
                        placeholder="Task"
                      />
                      <Input
                        value={form.jiraEmail}
                        onChange={(event) => updateForm(provider, { jiraEmail: event.target.value })}
                        placeholder="jira-owner@example.com"
                      />
                    </div>
                    <Input
                      value={form.jiraApiToken}
                      onChange={(event) => updateForm(provider, { jiraApiToken: event.target.value })}
                      placeholder={connector?.hasSecrets ? 'API token saved. Paste to rotate.' : 'Jira API token'}
                    />
                    <Textarea
                      rows={3}
                      value={form.statusMappings}
                      onChange={(event) => updateForm(provider, { statusMappings: event.target.value })}
                      placeholder={`OPEN => To Do\nIN_PROGRESS => In Progress\nDONE => Done`}
                    />
                  </>
                ) : null}

                {provider === 'CONFLUENCE' ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={form.confluenceBaseUrl}
                        onChange={(event) => updateForm(provider, { confluenceBaseUrl: event.target.value })}
                        placeholder="https://company.atlassian.net"
                      />
                      <Input
                        value={form.confluenceSpaceKey}
                        onChange={(event) => updateForm(provider, { confluenceSpaceKey: event.target.value })}
                        placeholder="SEC"
                      />
                      <Input
                        value={form.confluenceParentPageId}
                        onChange={(event) => updateForm(provider, { confluenceParentPageId: event.target.value })}
                        placeholder="Parent page ID (optional)"
                      />
                      <Input
                        value={form.confluenceEmail}
                        onChange={(event) => updateForm(provider, { confluenceEmail: event.target.value })}
                        placeholder="confluence-owner@example.com"
                      />
                    </div>
                    <Input
                      value={form.confluenceApiToken}
                      onChange={(event) => updateForm(provider, { confluenceApiToken: event.target.value })}
                      placeholder={connector?.hasSecrets ? 'API token saved. Paste to rotate.' : 'Confluence API token'}
                    />
                  </>
                ) : null}

                {provider === 'GOOGLE_DRIVE' ? (
                  <>
                    <Input
                      value={form.googleDriveFolderId}
                      onChange={(event) => updateForm(provider, { googleDriveFolderId: event.target.value })}
                      placeholder="Google Drive folder ID"
                    />
                    <Textarea
                      rows={4}
                      value={form.googleServiceAccountJson}
                      onChange={(event) => updateForm(provider, { googleServiceAccountJson: event.target.value })}
                      placeholder="Optional service account JSON for future Drive enablement"
                    />
                  </>
                ) : null}

                {provider === 'OUTBOUND_WEBHOOK' ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={form.outboundWebhookUrl}
                      onChange={(event) => updateForm(provider, { outboundWebhookUrl: event.target.value })}
                      placeholder="https://automation.example/hooks/vantage"
                    />
                    <Input
                      value={form.outboundWebhookSecret}
                      onChange={(event) => updateForm(provider, { outboundWebhookSecret: event.target.value })}
                      placeholder={connector?.hasSecrets ? 'Signing secret saved. Paste to rotate.' : 'Signing secret (optional)'}
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => saveConnector(provider)} disabled={busyKey === `save-${provider}`}>
                    {busyKey === `save-${provider}` ? 'Saving...' : connector ? 'Update Connector' : 'Create Connector'}
                  </Button>
                  {connector ? (
                    <Button
                      variant="outline"
                      onClick={() => runHealthCheck(connector.id, provider)}
                      disabled={busyKey === `health-${provider}`}
                    >
                      {busyKey === `health-${provider}` ? 'Testing...' : 'Run Health Check'}
                    </Button>
                  ) : null}
                </div>

                <div className="rounded-md border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Health</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {connector?.lastHealthStatus
                      ? `${connector.lastHealthStatus} at ${connector.lastHealthCheckedAt ?? 'unknown time'}`
                      : 'No health check recorded yet.'}
                  </p>
                  {connector?.lastErrorMessage ? <p className="mt-1 text-xs text-destructive">{connector.lastErrorMessage}</p> : null}
                </div>

                {connector?.objectLinks.length ? (
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked Objects</p>
                    <div className="mt-2 space-y-2">
                      {connector.objectLinks.slice(0, 4).map((link) => (
                        <div key={link.id} className="rounded border border-border bg-muted/20 p-2 text-xs">
                          <p className="font-semibold">
                            {link.entityType} {'->'} {link.externalObjectKey ?? link.externalObjectId}
                          </p>
                          <p className="text-muted-foreground">
                            {link.lastSyncStatus} {link.lastSyncedAt ? `at ${link.lastSyncedAt}` : ''}
                          </p>
                          {link.externalObjectUrl ? (
                            <Link href={link.externalObjectUrl} className="text-primary hover:underline">
                              Open external record
                            </Link>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-md border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Activity</p>
                  <div className="mt-2 space-y-2">
                    {(connector?.activities.length ? connector.activities : []).slice(0, 4).map((activity) => (
                      <div key={activity.id} className="rounded border border-border bg-muted/20 p-2 text-xs">
                        <p className="font-semibold">{activity.summary}</p>
                        <p className="text-muted-foreground">
                          {activity.action} | {activity.status} | {activity.createdAt}
                        </p>
                        {activity.externalObjectUrl ? (
                          <Link href={activity.externalObjectUrl} className="text-primary hover:underline">
                            Open external object
                          </Link>
                        ) : null}
                      </div>
                    ))}
                    {!connector?.activities.length ? (
                      <p className="text-xs text-muted-foreground">No connector activity recorded yet.</p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Send To Slack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={slackNotify.connectorId} onChange={(event) => setSlackNotify((prev) => ({ ...prev, connectorId: event.target.value }))}>
              <option value="">Select Slack connector</option>
              {connectors
                .filter((connector) => connector.provider === 'SLACK')
                .map((connector) => (
                  <option key={connector.id} value={connector.id}>
                    {connector.name}
                  </option>
                ))}
            </Select>
            <Input value={slackNotify.title} onChange={(event) => setSlackNotify((prev) => ({ ...prev, title: event.target.value }))} />
            <Textarea rows={4} value={slackNotify.body} onChange={(event) => setSlackNotify((prev) => ({ ...prev, body: event.target.value }))} />
            <Input value={slackNotify.href} onChange={(event) => setSlackNotify((prev) => ({ ...prev, href: event.target.value }))} placeholder="/app/trust/rooms" />
            <Button onClick={sendSlack} disabled={!slackNotify.connectorId || busyKey === 'slack-notify'}>
              {busyKey === 'slack-notify' ? 'Sending...' : 'Send Notification'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync To Jira</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={jiraSync.connectorId} onChange={(event) => setJiraSync((prev) => ({ ...prev, connectorId: event.target.value }))}>
              <option value="">Select Jira connector</option>
              {connectors
                .filter((connector) => connector.provider === 'JIRA')
                .map((connector) => (
                  <option key={connector.id} value={connector.id}>
                    {connector.name}
                  </option>
                ))}
            </Select>
            <Select
              value={`${jiraSync.entityType}:${jiraSync.entityId}`}
              onChange={(event) => {
                const [entityType, entityId] = event.target.value.split(':');
                setJiraSync((prev) => ({ ...prev, entityType: entityType as typeof prev.entityType, entityId }));
              }}
            >
              {syncTargets.map((target) => (
                <option key={`${target.entityType}:${target.id}`} value={`${target.entityType}:${target.id}`}>
                  {target.title} ({target.entityType})
                </option>
              ))}
            </Select>
            {selectedSyncTarget ? <p className="text-sm text-muted-foreground">{selectedSyncTarget.helper}</p> : null}
            <Button onClick={syncJira} disabled={!jiraSync.connectorId || !jiraSync.entityId || busyKey === 'jira-sync'}>
              {busyKey === 'jira-sync' ? 'Syncing...' : 'Sync Work Item'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publish To Docs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={docPublish.connectorId} onChange={(event) => setDocPublish((prev) => ({ ...prev, connectorId: event.target.value }))}>
              <option value="">Select publishing connector</option>
              {connectors
                .filter((connector) => connector.provider === 'CONFLUENCE' || connector.provider === 'GOOGLE_DRIVE')
                .map((connector) => (
                  <option key={connector.id} value={connector.id}>
                    {connector.name}
                  </option>
                ))}
            </Select>
            <Select
              value={`${docPublish.artifactType}:${docPublish.artifactId}`}
              onChange={(event) => {
                const [artifactType, artifactId] = event.target.value.split(':');
                setDocPublish((prev) => ({ ...prev, artifactType: artifactType as typeof prev.artifactType, artifactId }));
              }}
            >
              {publishTargets.map((target) => (
                <option key={`${target.artifactType}:${target.id}`} value={`${target.artifactType}:${target.id}`}>
                  {target.title} ({target.artifactType})
                </option>
              ))}
            </Select>
            {selectedPublishTarget ? <p className="text-sm text-muted-foreground">{selectedPublishTarget.helper}</p> : null}
            <Button onClick={publishDoc} disabled={!docPublish.connectorId || !docPublish.artifactId || busyKey === 'doc-publish'}>
              {busyKey === 'doc-publish' ? 'Publishing...' : 'Publish Artifact'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
