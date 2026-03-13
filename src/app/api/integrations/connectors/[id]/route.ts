import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError, notFound } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import {
  getConnectorConfigById,
  sanitizeConnectorConfig,
  upsertConnectorConfig
} from '@/lib/integrations/connectors';
import { buildConnectorPersistencePayload } from '@/lib/integrations/payloads';
import { connectorUpsertSchema } from '@/lib/validation/integrations';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const existing = await getConnectorConfigById(params.id, session.tenantId);
    if (!existing) return notFound('Connector not found');

    const payload = connectorUpsertSchema.parse(await request.json());
    const persistence = buildConnectorPersistencePayload(payload);

    const connector = await upsertConnectorConfig({
      id: params.id,
      tenantId: session.tenantId,
      userId: session.userId,
      provider: existing.provider,
      name: payload.name,
      description: payload.description ?? null,
      mode: payload.mode,
      status: payload.status,
      configJson: persistence.configJson,
      secretPayload: persistence.secretPayload
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'connector_config',
      entityId: connector.id,
      action: 'update',
      metadata: {
        provider: connector.provider,
        mode: connector.mode,
        status: connector.status
      }
    });

    return NextResponse.json(sanitizeConnectorConfig(connector));
  } catch (error) {
    return handleRouteError(error);
  }
}
