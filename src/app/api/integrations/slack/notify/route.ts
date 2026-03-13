import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { authBaseUrl } from '@/lib/auth/options';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError, notFound } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import {
  getConnectorConfigById,
  recordConnectorActivity
} from '@/lib/integrations/connectors';
import { sendSlackNotification } from '@/lib/integrations/slack';
import { slackNotificationSchema } from '@/lib/validation/integrations';

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = slackNotificationSchema.parse(await request.json());
    const connector = await getConnectorConfigById(payload.connectorId, session.tenantId);
    if (!connector || connector.provider !== 'SLACK') return notFound('Slack connector not found');

    const href = payload.href
      ? /^https?:\/\//i.test(payload.href)
        ? payload.href
        : `${authBaseUrl}${payload.href}`
      : `${authBaseUrl}/app/settings/connectors`;

    const result = await sendSlackNotification({
      connector,
      eventKey: payload.eventKey,
      title: payload.title,
      body: payload.body,
      href,
      severity: payload.severity
    });

    const activity = await recordConnectorActivity({
      tenantId: session.tenantId,
      connectorId: connector.id,
      provider: 'SLACK',
      action: 'manual_notify',
      entityType: 'notification',
      entityId: payload.eventKey,
      targetLabel: connector.name,
      status: result.status,
      summary: result.summary,
      payloadJson: result.payloadJson,
      errorMessage: 'errorMessage' in result ? result.errorMessage ?? null : null,
      createdBy: session.userId
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'connector_activity',
      entityId: activity.id,
      action: 'create',
      metadata: {
        provider: connector.provider,
        action: 'manual_notify',
        status: result.status
      }
    });

    return NextResponse.json({
      status: result.status,
      summary: result.summary
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
