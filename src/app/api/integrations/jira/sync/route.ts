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
import { syncEntityToJira } from '@/lib/integrations/jira';
import { jiraSyncSchema } from '@/lib/validation/integrations';

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = jiraSyncSchema.parse(await request.json());
    const connector = await getConnectorConfigById(payload.connectorId, session.tenantId);
    if (!connector || connector.provider !== 'JIRA') return notFound('Jira connector not found');

    const result = await syncEntityToJira({
      tenantId: session.tenantId,
      connector,
      entityType: payload.entityType,
      entityId: payload.entityId,
      vantageUrl: `${authBaseUrl}/app/${payload.entityType === 'risk' ? 'pulse/risks' : payload.entityType === 'task' ? 'response-ops' : payload.entityType === 'roadmap_item' ? 'pulse/roadmap' : 'findings'}`
    });

    const activity = await recordConnectorActivity({
      tenantId: session.tenantId,
      connectorId: connector.id,
      provider: 'JIRA',
      action: 'sync',
      entityType: payload.entityType,
      entityId: payload.entityId,
      targetLabel: connector.name,
      externalObjectId: 'externalObjectId' in result ? result.externalObjectId ?? null : null,
      externalObjectKey: 'externalObjectKey' in result ? result.externalObjectKey ?? null : null,
      externalObjectUrl: 'externalObjectUrl' in result ? result.externalObjectUrl ?? null : null,
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
        action: 'sync',
        status: result.status,
        entityType: payload.entityType,
        entityId: payload.entityId
      }
    });

    return NextResponse.json({
      status: result.status,
      summary: result.summary,
      externalObjectKey: 'externalObjectKey' in result ? result.externalObjectKey ?? null : null,
      externalObjectUrl: 'externalObjectUrl' in result ? result.externalObjectUrl ?? null : null
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
