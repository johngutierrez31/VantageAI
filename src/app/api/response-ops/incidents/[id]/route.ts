import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError, badRequest } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { getIncidentDetail, updateIncidentRecord } from '@/lib/response-ops/records';
import { incidentUpdateSchema } from '@/lib/validation/response-ops';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const detail = await getIncidentDetail(session.tenantId, params.id);
    return NextResponse.json(detail);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = incidentUpdateSchema.parse(await request.json());

    const detail = await updateIncidentRecord({
      tenantId: session.tenantId,
      incidentId: params.id,
      actorUserId: session.userId,
      input: {
        ...payload,
        declaredAt: payload.declaredAt ? new Date(payload.declaredAt) : payload.declaredAt === null ? null : undefined,
        containedAt: payload.containedAt
          ? new Date(payload.containedAt)
          : payload.containedAt === null
            ? null
            : undefined,
        resolvedAt: payload.resolvedAt ? new Date(payload.resolvedAt) : payload.resolvedAt === null ? null : undefined,
        nextUpdateDueAt: payload.nextUpdateDueAt
          ? new Date(payload.nextUpdateDueAt)
          : payload.nextUpdateDueAt === null
            ? null
            : undefined,
        executiveSummary: payload.executiveSummary ?? undefined,
        internalNotes: payload.internalNotes ?? undefined
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'incident',
      entityId: detail.incident.id,
      action: 'incident_updated',
      metadata: {
        status: detail.incident.status,
        severity: detail.incident.severity,
        incidentOwnerUserId: detail.incident.incidentOwnerUserId,
        communicationsOwnerUserId: detail.incident.communicationsOwnerUserId
      }
    });

    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_REVIEWER') {
      return badRequest('Assigned incident or communications owner must be an active member of this tenant');
    }
    return handleRouteError(error);
  }
}
