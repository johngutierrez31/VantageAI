import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { roadmapItemUpdateSchema } from '@/lib/validation/pulse';
import { updateRoadmapItem } from '@/lib/pulse/roadmap';
import { assertTenantReviewer } from '@/lib/trust/reviewers';
import { writeAuditLog } from '@/lib/audit';

export async function PATCH(request: Request, { params }: { params: { itemId: string } }) {
  try {
    const session = await getSessionContext();
    const payload = roadmapItemUpdateSchema.parse(await request.json());
    if (payload.ownerUserId) {
      await assertTenantReviewer(session.tenantId, payload.ownerUserId);
    }

    const item = await updateRoadmapItem({
      tenantId: session.tenantId,
      itemId: params.itemId,
      title: payload.title,
      ownerUserId: payload.ownerUserId,
      dueAt: payload.dueAt === undefined ? undefined : payload.dueAt ? new Date(payload.dueAt) : null,
      status: payload.status,
      rationale: payload.rationale,
      expectedImpact: payload.expectedImpact
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'roadmap_item',
      entityId: item.id,
      action: 'roadmap_item_updated',
      metadata: {
        status: item.status,
        horizon: item.horizon,
        ownerUserId: item.ownerUserId
      }
    });

    return NextResponse.json(item);
  } catch (error) {
    return handleRouteError(error);
  }
}
