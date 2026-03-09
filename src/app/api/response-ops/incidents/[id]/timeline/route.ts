import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { addIncidentTimelineNote } from '@/lib/response-ops/records';
import { incidentTimelineEventCreateSchema } from '@/lib/validation/response-ops';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = incidentTimelineEventCreateSchema.parse(await request.json());

    const event = await addIncidentTimelineNote({
      tenantId: session.tenantId,
      incidentId: params.id,
      userId: session.userId,
      eventType: payload.eventType,
      title: payload.title,
      detail: payload.detail ?? null,
      isShareable: payload.isShareable
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'incident',
      entityId: params.id,
      action: 'incident_timeline_event_created',
      metadata: {
        eventType: event.eventType,
        title: event.title,
        isShareable: event.isShareable
      }
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
