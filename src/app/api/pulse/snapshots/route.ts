import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { pulseSnapshotCreateSchema } from '@/lib/validation/pulse';
import { generatePulseSnapshotRecord } from '@/lib/pulse/scoring';

export async function GET() {
  try {
    const session = await getSessionContext();
    const snapshots = await prisma.pulseSnapshot.findMany({
      where: {
        tenantId: session.tenantId
      },
      include: {
        categoryScores: {
          orderBy: { categoryKey: 'asc' }
        }
      },
      orderBy: { snapshotDate: 'desc' },
      take: 24
    });

    return NextResponse.json(snapshots);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    const payload = pulseSnapshotCreateSchema.parse(await request.json());
    const snapshot = await generatePulseSnapshotRecord({
      tenantId: session.tenantId,
      userId: session.userId,
      periodType: payload.periodType,
      snapshotDate: payload.snapshotDate ? new Date(payload.snapshotDate) : undefined,
      name: payload.name
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'pulse_snapshot',
      entityId: snapshot.id,
      action: 'pulse_snapshot_generated',
      metadata: {
        reportingPeriod: snapshot.reportingPeriod,
        periodType: snapshot.periodType,
        overallScore: snapshot.overallScore
      }
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
