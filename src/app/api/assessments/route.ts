import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { assessmentCreateSchema } from '@/lib/validation/assessment';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import { handleRouteError } from '@/lib/http';

export async function GET() {
  try {
    const session = await getSessionContext();
    const data = await prisma.assessment.findMany({
      where: { tenantId: session.tenantId },
      include: { template: true },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = assessmentCreateSchema.parse(await request.json());

    const template = await prisma.template.findFirst({
      where: { id: payload.templateId, tenantId: session.tenantId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
    });
    if (!template || !template.versions[0]) {
      return NextResponse.json({ error: 'Template unavailable' }, { status: 400 });
    }

    const entitlements = await getTenantEntitlements(session.tenantId);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyCount = await prisma.assessment.count({
      where: { tenantId: session.tenantId, createdAt: { gte: monthStart } }
    });

    if (monthlyCount >= entitlements.limits.maxAssessmentsPerMonth) {
      return NextResponse.json({ error: 'Assessment monthly limit reached for current plan' }, { status: 402 });
    }

    const assessment = await prisma.assessment.create({
      data: {
        tenantId: session.tenantId,
        templateId: template.id,
        templateVersionId: template.versions[0].id,
        name: payload.name,
        customerName: payload.customerName,
        createdBy: session.userId,
        status: 'IN_PROGRESS'
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'assessment',
      entityId: assessment.id,
      action: 'create',
      metadata: { templateId: template.id }
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

