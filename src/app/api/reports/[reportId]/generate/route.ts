import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { requireRole } from '@/lib/rbac/authorize';
import { requireBrandedReportAccess } from '@/lib/billing/entitlements';
import { generateAssessmentReport } from '@/lib/report/generate';
import { handleRouteError } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function POST(_: Request, { params }: { params: { reportId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    await requireBrandedReportAccess(session.tenantId);

    // Backwards-compatible alias: /api/reports/:assessmentId/generate
    const result = await generateAssessmentReport({
      tenantId: session.tenantId,
      assessmentId: params.reportId,
      userId: session.userId
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'report',
      entityId: result.report.id,
      action: 'generate',
      metadata: {
        assessmentId: params.reportId
      }
    });

    return NextResponse.json(result.report, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
