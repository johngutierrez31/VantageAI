import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { updateAfterActionReport } from '@/lib/response-ops/after-action';
import { afterActionUpdateSchema } from '@/lib/validation/response-ops';

export async function GET(_: Request, { params }: { params: { reportId: string } }) {
  try {
    const session = await getSessionContext();
    const report = await prisma.afterActionReport.findFirstOrThrow({
      where: {
        tenantId: session.tenantId,
        id: params.reportId
      },
      include: {
        incident: true
      }
    });

    return NextResponse.json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { reportId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = afterActionUpdateSchema.parse(await request.json());

    const report = await updateAfterActionReport({
      tenantId: session.tenantId,
      reportId: params.reportId,
      actorUserId: session.userId,
      status: payload.status,
      reviewerNotes: payload.reviewerNotes ?? null
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'after_action_report',
      entityId: report.id,
      action: 'after_action_updated',
      metadata: {
        status: report.status,
        reviewedBy: report.reviewedBy,
        approvedBy: report.approvedBy
      }
    });

    return NextResponse.json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
