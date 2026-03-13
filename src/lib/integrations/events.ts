import { authBaseUrl } from '@/lib/auth/options';
import { getActiveConnectorConfigs, recordConnectorActivity } from '@/lib/integrations/connectors';
import { sendSlackNotification, slackConnectorHandlesEvent } from '@/lib/integrations/slack';
import { sendWebhookNotification, webhookConnectorHandlesEvent } from '@/lib/integrations/webhook';

type IntegrationEvent = {
  tenantId: string;
  actorUserId?: string | null;
  eventKey:
    | 'trust_room_request_received'
    | 'incident_created'
    | 'quarterly_review_ready'
    | 'manual_notification';
  title: string;
  body: string;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

function toAbsoluteHref(href: string | null | undefined) {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  return `${authBaseUrl}${href}`;
}

export async function dispatchIntegrationEvent(event: IntegrationEvent) {
  const connectors = await getActiveConnectorConfigs(event.tenantId, ['SLACK', 'OUTBOUND_WEBHOOK']);
  const href = toAbsoluteHref(event.href);

  await Promise.all(
    connectors.map(async (connector) => {
      try {
        if (connector.provider === 'SLACK') {
          if (!slackConnectorHandlesEvent(connector, event.eventKey)) return;
          const result = await sendSlackNotification({
            connector,
            title: event.title,
            body: event.body,
            eventKey: event.eventKey,
            href,
            metadata: event.metadata
          });

          await recordConnectorActivity({
            tenantId: event.tenantId,
            connectorId: connector.id,
            provider: 'SLACK',
            action: 'notify',
            entityType: event.entityType,
            entityId: event.entityId,
            targetLabel: connector.name,
            status: result.status,
            summary: result.summary,
            payloadJson: result.payloadJson,
            errorMessage: 'errorMessage' in result ? result.errorMessage ?? null : null,
            createdBy: event.actorUserId ?? null
          });
          return;
        }

        if (connector.provider === 'OUTBOUND_WEBHOOK') {
          if (!webhookConnectorHandlesEvent(connector, event.eventKey)) return;
          const result = await sendWebhookNotification({
            connector,
            eventKey: event.eventKey,
            title: event.title,
            body: event.body,
            href,
            entityType: event.entityType,
            entityId: event.entityId,
            metadata: event.metadata
          });

          await recordConnectorActivity({
            tenantId: event.tenantId,
            connectorId: connector.id,
            provider: 'OUTBOUND_WEBHOOK',
            action: 'notify',
            entityType: event.entityType,
            entityId: event.entityId,
            targetLabel: connector.name,
            status: result.status,
            summary: result.summary,
            payloadJson: result.payloadJson,
            errorMessage: 'errorMessage' in result ? result.errorMessage ?? null : null,
            createdBy: event.actorUserId ?? null
          });
        }
      } catch (error) {
        await recordConnectorActivity({
          tenantId: event.tenantId,
          connectorId: connector.id,
          provider: connector.provider,
          action: 'notify',
          entityType: event.entityType,
          entityId: event.entityId,
          targetLabel: connector.name,
          status: 'FAILED',
          summary: `Connector event failed for ${event.eventKey}`,
          errorMessage: error instanceof Error ? error.message : String(error),
          createdBy: event.actorUserId ?? null
        });
      }
    })
  );
}
