import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { generateAfterActionReportRecord } from '@/lib/response-ops/after-action';
import { afterActionGenerateSchema } from '@/lib/validation/response-ops';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const report = await prisma.afterActionReport.findFirst({
      where: {
        tenantId: session.tenantId,
        incidentId: params.id
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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = afterActionGenerateSchema.parse(await request.json());

    const report = await generateAfterActionReportRecord({
      tenantId: session.tenantId,
      userId: session.userId,
      incidentId: params.id,
      title: payload.title
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'after_action_report',
      entityId: report.id,
      action: 'after_action_generated',
      metadata: {
        incidentId: params.id,
        status: report.status
      }
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
