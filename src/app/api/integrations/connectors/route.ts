import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import {
  listConnectorConfigs,
  sanitizeConnectorConfig,
  upsertConnectorConfig
} from '@/lib/integrations/connectors';
import { buildConnectorPersistencePayload } from '@/lib/integrations/payloads';
import { connectorUpsertSchema } from '@/lib/validation/integrations';

export async function GET() {
  try {
    const session = await getSessionContext();
    const connectors = await listConnectorConfigs(session.tenantId);
    return NextResponse.json(connectors.map((connector) => sanitizeConnectorConfig(connector)));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = connectorUpsertSchema.parse(await request.json());
    const persistence = buildConnectorPersistencePayload(payload);

    const connector = await upsertConnectorConfig({
      id: payload.id,
      tenantId: session.tenantId,
      userId: session.userId,
      provider: payload.provider,
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
      action: payload.id ? 'update' : 'create',
      metadata: {
        provider: connector.provider,
        mode: connector.mode,
        status: connector.status
      }
    });

    return NextResponse.json(sanitizeConnectorConfig(connector), {
      status: payload.id ? 200 : 201
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
