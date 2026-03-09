import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { createIncidentRunbookPack } from '@/lib/response-ops/records';
import { incidentRunbookPackCreateSchema } from '@/lib/validation/response-ops';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = incidentRunbookPackCreateSchema.parse(await request.json());

    const pack = await createIncidentRunbookPack({
      tenantId: session.tenantId,
      incidentId: params.id,
      userId: session.userId,
      runbookId: payload.runbookId ?? null,
      assignee: payload.assignee ?? null
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'incident_runbook_pack',
      entityId: pack.id,
      action: 'incident_runbook_pack_created',
      metadata: {
        incidentId: params.id,
        runbookId: pack.runbookId,
        taskCount: pack.tasks.length
      }
    });

    return NextResponse.json(pack, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
