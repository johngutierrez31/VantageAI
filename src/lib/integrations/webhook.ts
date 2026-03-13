import { createHmac } from 'node:crypto';
import type { ConnectorConfig, Prisma } from '@prisma/client';
import { getConnectorSecrets, toPrismaJson } from '@/lib/integrations/connectors';

type WebhookConnector = Pick<ConnectorConfig, 'id' | 'provider' | 'mode' | 'configJson' | 'secretCiphertext'>;

function getWebhookConfig(connector: WebhookConnector) {
  const config = (connector.configJson ?? {}) as Prisma.JsonObject;
  const secrets = getConnectorSecrets(connector);

  return {
    enabledEventKeys: Array.isArray(config.enabledEventKeys)
      ? config.enabledEventKeys.filter((value): value is string => typeof value === 'string')
      : [],
    webhookUrl:
      typeof config.outboundWebhookUrl === 'string'
        ? config.outboundWebhookUrl
        : typeof secrets.outboundWebhookUrl === 'string'
          ? secrets.outboundWebhookUrl
          : null,
    signingSecret: typeof secrets.outboundWebhookSecret === 'string' ? secrets.outboundWebhookSecret : null
  };
}

export function webhookConnectorHandlesEvent(connector: WebhookConnector, eventKey: string) {
  const config = getWebhookConfig(connector);
  return !config.enabledEventKeys.length || config.enabledEventKeys.includes(eventKey);
}

export async function sendWebhookNotification(args: {
  connector: WebhookConnector;
  eventKey: string;
  title: string;
  body: string;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const config = getWebhookConfig(args.connector);
  const payload = {
    eventKey: args.eventKey,
    title: args.title,
    body: args.body,
    href: args.href ?? null,
    entityType: args.entityType ?? null,
    entityId: args.entityId ?? null,
    metadata: args.metadata ?? {}
  };

  if (args.connector.mode === 'SIMULATED') {
    return {
      status: 'SUCCEEDED' as const,
      summary: `Simulated outbound webhook for ${args.eventKey}`,
      payloadJson: toPrismaJson(payload)
    };
  }

  if (!config.webhookUrl) {
    return {
      status: 'FAILED' as const,
      summary: 'Outbound webhook URL is missing',
      errorMessage: 'Outbound webhook live mode requires a target URL'
    };
  }

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.signingSecret) {
    headers['x-vantage-signature'] = createHmac('sha256', config.signingSecret).update(body).digest('hex');
  }

  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers,
    body
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      status: 'FAILED' as const,
      summary: `Outbound webhook failed with ${response.status}`,
      errorMessage: text.slice(0, 400)
    };
  }

  return {
    status: 'SUCCEEDED' as const,
    summary: `Outbound webhook sent for ${args.eventKey}`,
    payloadJson: toPrismaJson(payload)
  };
}
