import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { riskRegisterUpdateSchema } from '@/lib/validation/pulse';
import { updateRiskRegisterItem } from '@/lib/pulse/risk-register';
import { writeAuditLog } from '@/lib/audit';
import { assertTenantReviewer } from '@/lib/trust/reviewers';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const risk = await prisma.riskRegisterItem.findFirstOrThrow({
      where: {
        tenantId: session.tenantId,
        id: params.id
      }
    });

    return NextResponse.json(risk);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const payload = riskRegisterUpdateSchema.parse(await request.json());
    if (payload.ownerUserId) {
      await assertTenantReviewer(session.tenantId, payload.ownerUserId);
    }

    const risk = await updateRiskRegisterItem({
      tenantId: session.tenantId,
      riskId: params.id,
      actorUserId: session.userId,
      status: payload.status,
      ownerUserId: payload.ownerUserId,
      targetDueAt: payload.targetDueAt === undefined ? undefined : payload.targetDueAt ? new Date(payload.targetDueAt) : null,
      reviewNotes: payload.reviewNotes,
      title: payload.title,
      description: payload.description,
      businessImpactSummary: payload.businessImpactSummary,
      severity: payload.severity,
      likelihood: payload.likelihood,
      impact: payload.impact
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'risk_register_item',
      entityId: risk.id,
      action: 'risk_register_item_updated',
      metadata: {
        status: risk.status,
        severity: risk.severity,
        ownerUserId: risk.ownerUserId
      }
    });

    return NextResponse.json(risk);
  } catch (error) {
    return handleRouteError(error);
  }
}
