import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { pulseSnapshotUpdateSchema } from '@/lib/validation/pulse';
import { writeAuditLog } from '@/lib/audit';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const snapshot = await prisma.pulseSnapshot.findFirstOrThrow({
      where: {
        tenantId: session.tenantId,
        id: params.id
      },
      include: {
        categoryScores: {
          orderBy: { categoryKey: 'asc' }
        },
        roadmaps: {
          select: {
            id: true,
            name: true,
            status: true,
            updatedAt: true
          },
          orderBy: { updatedAt: 'desc' }
        },
        boardBriefs: {
          select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true
          },
          orderBy: { updatedAt: 'desc' }
        },
        quarterlyReviews: {
          select: {
            id: true,
            reviewPeriod: true,
            status: true,
            reviewDate: true
          },
          orderBy: { reviewDate: 'desc' }
        }
      }
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const payload = pulseSnapshotUpdateSchema.parse(await request.json());
    const nextStatus = payload.status;
    const approvedState = nextStatus === 'APPROVED' || nextStatus === 'PUBLISHED';
    const publishedState = nextStatus === 'PUBLISHED';
    const snapshot = await prisma.pulseSnapshot.findFirstOrThrow({
      where: {
        tenantId: session.tenantId,
        id: params.id
      }
    });

    const updated = await prisma.pulseSnapshot.update({
      where: { id: snapshot.id },
      data: {
        status: nextStatus,
        reviewedBy: nextStatus ? session.userId : undefined,
        reviewedAt: nextStatus ? new Date() : undefined,
        approvedBy: approvedState ? session.userId : nextStatus ? null : undefined,
        approvedAt: approvedState ? new Date() : nextStatus ? null : undefined,
        publishedAt: publishedState ? new Date() : nextStatus ? null : undefined
      },
      include: {
        categoryScores: {
          orderBy: { categoryKey: 'asc' }
        }
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'pulse_snapshot',
      entityId: updated.id,
      action: 'pulse_snapshot_review_updated',
      metadata: {
        status: updated.status
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
