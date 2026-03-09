import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError, badRequest } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { createIncidentRecord, listIncidents } from '@/lib/response-ops/records';
import { incidentCreateSchema } from '@/lib/validation/response-ops';

export async function GET(request: Request) {
  try {
    const session = await getSessionContext();
    const { searchParams } = new URL(request.url);
    const incidents = await listIncidents(session.tenantId, {
      status: searchParams.get('status') ?? undefined,
      severity: searchParams.get('severity') ?? undefined,
      incidentType: searchParams.get('incidentType') ?? undefined,
      ownerUserId: searchParams.get('ownerUserId') ?? undefined,
      search: searchParams.get('q') ?? undefined
    });

    return NextResponse.json(incidents);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = incidentCreateSchema.parse(await request.json());

    const created = await createIncidentRecord({
      tenantId: session.tenantId,
      userId: session.userId,
      input: {
        ...payload,
        detectionSource: payload.detectionSource ?? null,
        reportedBy: payload.reportedBy ?? null,
        incidentOwnerUserId: payload.incidentOwnerUserId ?? null,
        communicationsOwnerUserId: payload.communicationsOwnerUserId ?? null,
        aiUseCaseId: payload.aiUseCaseId ?? null,
        aiVendorReviewId: payload.aiVendorReviewId ?? null,
        questionnaireUploadId: payload.questionnaireUploadId ?? null,
        trustInboxItemId: payload.trustInboxItemId ?? null,
        startedAt: payload.startedAt ? new Date(payload.startedAt) : undefined,
        nextUpdateDueAt: payload.nextUpdateDueAt ? new Date(payload.nextUpdateDueAt) : null,
        executiveSummary: payload.executiveSummary ?? null,
        internalNotes: payload.internalNotes ?? null,
        assignee: payload.assignee ?? null,
        runbookId: payload.runbookId ?? null
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'incident',
      entityId: created.incident.id,
      action: 'incident_created',
      metadata: {
        incidentType: created.incident.incidentType,
        severity: created.incident.severity,
        status: created.incident.status,
        guidedStart: payload.guidedStart,
        launchRunbookPack: payload.launchRunbookPack
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_REVIEWER') {
      return badRequest('Assigned incident or communications owner must be an active member of this tenant');
    }
    if (error instanceof Error && error.message === 'AI_USE_CASE_NOT_FOUND') {
      return badRequest('Linked AI use case was not found for this tenant');
    }
    if (error instanceof Error && error.message === 'AI_VENDOR_REVIEW_NOT_FOUND') {
      return badRequest('Linked AI vendor review was not found for this tenant');
    }
    if (error instanceof Error && error.message === 'QUESTIONNAIRE_UPLOAD_NOT_FOUND') {
      return badRequest('Linked questionnaire was not found for this tenant');
    }
    if (error instanceof Error && error.message === 'TRUST_INBOX_ITEM_NOT_FOUND') {
      return badRequest('Linked trust inbox item was not found for this tenant');
    }
    return handleRouteError(error);
  }
}
