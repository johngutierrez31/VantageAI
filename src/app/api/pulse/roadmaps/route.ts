import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { listRoadmaps, generateRoadmapRecord } from '@/lib/pulse/roadmap';
import { roadmapGenerateSchema } from '@/lib/validation/pulse';

export async function GET() {
  try {
    const session = await getSessionContext();
    const roadmaps = await listRoadmaps(session.tenantId);
    return NextResponse.json(roadmaps);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    const payload = roadmapGenerateSchema.parse(await request.json());
    const roadmap = await generateRoadmapRecord({
      tenantId: session.tenantId,
      userId: session.userId,
      snapshotId: payload.snapshotId,
      name: payload.name
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'pulse_roadmap',
      entityId: roadmap.id,
      action: 'pulse_roadmap_generated',
      metadata: {
        snapshotId: roadmap.snapshotId,
        itemCount: roadmap.items.length
      }
    });

    return NextResponse.json(roadmap, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
