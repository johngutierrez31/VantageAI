import type { ConnectorProvider } from '@prisma/client';

export const CONNECTOR_PROVIDER_ORDER: ConnectorProvider[] = [
  'SLACK',
  'JIRA',
  'CONFLUENCE',
  'GOOGLE_DRIVE',
  'OUTBOUND_WEBHOOK'
];

export const CONNECTOR_PROVIDER_LABELS: Record<ConnectorProvider, string> = {
  SLACK: 'Slack',
  JIRA: 'Jira',
  CONFLUENCE: 'Confluence',
  GOOGLE_DRIVE: 'Google Drive',
  OUTBOUND_WEBHOOK: 'Outbound Webhook'
};

export const CONNECTOR_PROVIDER_CAPABILITIES: Record<
  ConnectorProvider,
  { summary: string; status: 'live' | 'scaffolded'; actions: string[] }
> = {
  SLACK: {
    summary: 'Push buyer requests, incidents, and review-ready updates into existing team channels.',
    status: 'live',
    actions: ['Send event notifications', 'Deep link back into Vantage', 'Route to a default channel or webhook']
  },
  JIRA: {
    summary: 'Create or refresh Jira issues for findings, risks, roadmap work, and incident follow-ups.',
    status: 'live',
    actions: ['Create issues', 'Refresh synced issues', 'Store Vantage-to-Jira links']
  },
  CONFLUENCE: {
    summary: 'Publish share-safe HTML artifacts as Confluence pages for board and buyer-ready document workflows.',
    status: 'live',
    actions: ['Create pages', 'Update previously published pages', 'Store page links']
  },
  GOOGLE_DRIVE: {
    summary: 'Framework-ready document publisher placeholder for teams that prefer Drive over Confluence.',
    status: 'scaffolded',
    actions: ['Configuration placeholder', 'Health visibility', 'Deferred for auth-safe follow-up']
  },
  OUTBOUND_WEBHOOK: {
    summary: 'Fan out narrow event payloads into external automations without building a full iPaaS.',
    status: 'live',
    actions: ['POST event payloads', 'Deep links to source records', 'Connector health logging']
  }
};
