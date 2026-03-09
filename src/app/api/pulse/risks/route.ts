import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { createManualRiskItem, listRiskRegisterItems, syncRiskRegister } from '@/lib/pulse/risk-register';
import { riskRegisterCreateSchema, riskRegisterSyncSchema } from '@/lib/validation/pulse';
import { assertTenantReviewer } from '@/lib/trust/reviewers';

export async function GET(request: Request) {
  try {
    const session = await getSessionContext();
    const { searchParams } = new URL(request.url);
    const risks = await listRiskRegisterItems(session.tenantId, {
      status: searchParams.get('status') ?? undefined,
      severity: searchParams.get('severity') ?? undefined,
      sourceModule: searchParams.get('sourceModule') ?? undefined,
      ownerUserId: searchParams.get('ownerUserId') ?? undefined,
      overdue: searchParams.get('overdue') === 'true'
    });

    return NextResponse.json(risks);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    const body = await request.json();

    if (body?.mode === 'sync') {
      riskRegisterSyncSchema.parse({ includeManual: false });
      const risks = await syncRiskRegister({
        tenantId: session.tenantId,
        userId: session.userId
      });

      await writeAuditLog({
        tenantId: session.tenantId,
        actorUserId: session.userId,
        entityType: 'risk_register',
        entityId: session.tenantId,
        action: 'risk_register_synced',
        metadata: {
          count: risks.length
        }
      });

      return NextResponse.json(risks, { status: 201 });
    }

    const payload = riskRegisterCreateSchema.parse(body);
    if (payload.ownerUserId) {
      await assertTenantReviewer(session.tenantId, payload.ownerUserId);
    }

    const risk = await createManualRiskItem({
      tenantId: session.tenantId,
      userId: session.userId,
      title: payload.title,
      description: payload.description,
      businessImpactSummary: payload.businessImpactSummary,
      severity: payload.severity,
      likelihood: payload.likelihood,
      impact: payload.impact,
      status: payload.status,
      ownerUserId: payload.ownerUserId ?? null,
      targetDueAt: payload.targetDueAt ? new Date(payload.targetDueAt) : null,
      linkedControlIds: payload.linkedControlIds,
      linkedFindingIds: payload.linkedFindingIds,
      linkedTaskIds: payload.linkedTaskIds,
      linkedQuestionnaireIds: payload.linkedQuestionnaireIds,
      linkedEvidenceMapIds: payload.linkedEvidenceMapIds,
      linkedTrustPacketIds: payload.linkedTrustPacketIds,
      linkedAssessmentIds: payload.linkedAssessmentIds,
      reviewNotes: payload.reviewNotes
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'risk_register_item',
      entityId: risk.id,
      action: 'risk_register_item_created',
      metadata: {
        sourceType: risk.sourceType,
        severity: risk.severity
      }
    });

    return NextResponse.json(risk, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
