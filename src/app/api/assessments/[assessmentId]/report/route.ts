import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { handleRouteError, notFound } from '@/lib/http';
import { generateAssessmentReport } from '@/lib/report/generate';
import { requireBrandedReportAccess } from '@/lib/billing/entitlements';
import { writeAuditLog } from '@/lib/audit';

export async function GET(_: Request, { params }: { params: { assessmentId: string } }) {
  try {
    const session = await getSessionContext();

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.assessmentId, tenantId: session.tenantId }
    });
    if (!assessment) return notFound('Assessment not found');

    const report = await prisma.report.findFirst({
      where: { tenantId: session.tenantId, assessmentId: assessment.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!report) return notFound('Report has not been generated yet');

    return NextResponse.json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(_: Request, { params }: { params: { assessmentId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    await requireBrandedReportAccess(session.tenantId);

    const result = await generateAssessmentReport({
      tenantId: session.tenantId,
      assessmentId: params.assessmentId,
      userId: session.userId
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'report',
      entityId: result.report.id,
      action: 'generate',
      metadata: {
        assessmentId: params.assessmentId,
        score: result.score.overall
      }
    });

    return NextResponse.json(result.report, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
