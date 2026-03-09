import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { boardBriefGenerateSchema } from '@/lib/validation/pulse';
import { generateBoardBriefRecord, listBoardBriefs } from '@/lib/pulse/board-briefs';

export async function GET() {
  try {
    const session = await getSessionContext();
    const briefs = await listBoardBriefs(session.tenantId);
    return NextResponse.json(briefs);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    const payload = boardBriefGenerateSchema.parse(await request.json());
    const brief = await generateBoardBriefRecord({
      tenantId: session.tenantId,
      userId: session.userId,
      snapshotId: payload.snapshotId,
      roadmapId: payload.roadmapId,
      title: payload.title
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'board_brief',
      entityId: brief.id,
      action: 'board_brief_generated',
      metadata: {
        reportingPeriod: brief.reportingPeriod,
        status: brief.status
      }
    });

    return NextResponse.json(brief, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
