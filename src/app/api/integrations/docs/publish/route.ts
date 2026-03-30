import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError, notFound } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import {
  getConnectorConfigById,
  recordConnectorActivity
} from '@/lib/integrations/connectors';
import { publishArtifactToConfluence } from '@/lib/integrations/confluence';
import { publishArtifactToGoogleDrive } from '@/lib/integrations/google-drive';
import { documentPublishSchema } from '@/lib/validation/integrations';

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = documentPublishSchema.parse(await request.json());
    const connector = await getConnectorConfigById(payload.connectorId, session.tenantId);
    if (!connector) return notFound('Connector not found');

    if (connector.provider !== 'CONFLUENCE' && connector.provider !== 'GOOGLE_DRIVE') {
      return notFound('Document publishing connector not found');
    }

    const result =
      connector.provider === 'CONFLUENCE'
        ? await publishArtifactToConfluence({
            tenantId: session.tenantId,
            connector,
            artifactType: payload.artifactType,
            artifactId: payload.artifactId
          })
        : await publishArtifactToGoogleDrive({
            tenantId: session.tenantId,
            connector,
            artifactType: payload.artifactType,
            artifactId: payload.artifactId
          });

    const activity = await recordConnectorActivity({
      tenantId: session.tenantId,
      connectorId: connector.id,
      provider: connector.provider,
      action: 'publish',
      entityType: payload.artifactType,
      entityId: payload.artifactId,
      targetLabel: connector.name,
      externalObjectId: 'externalObjectId' in result ? result.externalObjectId ?? null : null,
      externalObjectKey: 'externalObjectKey' in result ? result.externalObjectKey ?? null : null,
      externalObjectUrl: 'externalObjectUrl' in result ? result.externalObjectUrl ?? null : null,
      status: result.status,
      summary: result.summary,
      payloadJson: 'payloadJson' in result ? result.payloadJson : undefined,
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
        action: 'publish',
        status: result.status,
        artifactType: payload.artifactType,
        artifactId: payload.artifactId
      }
    });

    return NextResponse.json({
      status: result.status,
      summary: result.summary,
      externalObjectUrl: 'externalObjectUrl' in result ? result.externalObjectUrl ?? null : null
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
