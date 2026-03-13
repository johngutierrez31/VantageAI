import type { ConnectorConfig, Prisma } from '@prisma/client';
import { getConnectorSecrets, toPrismaJson } from '@/lib/integrations/connectors';

type SlackConnector = Pick<ConnectorConfig, 'id' | 'provider' | 'mode' | 'configJson' | 'secretCiphertext'>;

function getSlackConfig(connector: SlackConnector) {
  const config = (connector.configJson ?? {}) as Prisma.JsonObject;
  const secrets = getConnectorSecrets(connector);
  return {
    defaultChannel: typeof config.defaultChannel === 'string' ? config.defaultChannel : null,
    enabledEventKeys: Array.isArray(config.enabledEventKeys)
      ? config.enabledEventKeys.filter((value): value is string => typeof value === 'string')
      : [],
    webhookUrl: typeof secrets.webhookUrl === 'string' ? secrets.webhookUrl : null
  };
}

export function slackConnectorHandlesEvent(connector: SlackConnector, eventKey: string) {
  const config = getSlackConfig(connector);
  return !config.enabledEventKeys.length || config.enabledEventKeys.includes(eventKey);
}

export async function sendSlackNotification(args: {
  connector: SlackConnector;
  title: string;
  body: string;
  eventKey: string;
  href?: string | null;
  severity?: 'info' | 'warning' | 'critical';
  metadata?: Record<string, unknown>;
}) {
  const config = getSlackConfig(args.connector);
  const summary = `${args.title}${config.defaultChannel ? ` -> ${config.defaultChannel}` : ''}`;

  if (args.connector.mode === 'SIMULATED') {
    return {
      status: 'SUCCEEDED' as const,
      summary: `Simulated Slack notification: ${summary}`,
      payloadJson: toPrismaJson({
        eventKey: args.eventKey,
        channel: config.defaultChannel,
        href: args.href ?? null,
        severity: args.severity ?? 'info',
        metadata: args.metadata ?? {}
      })
    };
  }

  if (!config.webhookUrl) {
    return {
      status: 'FAILED' as const,
      summary: 'Slack connector is missing a webhook URL',
      errorMessage: 'Slack live mode requires a webhook URL secret'
    };
  }

  const lines = [args.title, args.body];
  if (args.href) lines.push(args.href);

  const payload = {
    text: lines.join('\n'),
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${args.title}*\n${args.body}`
        }
      },
      ...(args.href
        ? [
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Open in Vantage' },
                  url: args.href
                }
              ]
            }
          ]
        : [])
    ]
  };

  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      status: 'FAILED' as const,
      summary: `Slack notification failed with ${response.status}`,
      errorMessage: text.slice(0, 400)
    };
  }

  return {
    status: 'SUCCEEDED' as const,
    summary: `Slack notification sent${config.defaultChannel ? ` to ${config.defaultChannel}` : ''}`,
    payloadJson: toPrismaJson({
      eventKey: args.eventKey,
      channel: config.defaultChannel,
      href: args.href ?? null
    })
  };
}
