import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { questionnaireAssignmentSchema } from '@/lib/validation/questionnaire';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { assertTenantReviewer } from '@/lib/trust/reviewers';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = questionnaireAssignmentSchema.parse(await request.json());

    const upload = await prisma.questionnaireUpload.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      }
    });

    if (!upload) return notFound('Questionnaire upload not found');

    const reviewer = await assertTenantReviewer(session.tenantId, payload.assignedReviewerUserId);

    const updated = await prisma.questionnaireUpload.update({
      where: { id: upload.id },
      data: {
        assignedReviewerUserId:
          payload.assignedReviewerUserId === undefined ? undefined : payload.assignedReviewerUserId,
        reviewDueAt:
          payload.reviewDueAt === undefined ? undefined : payload.reviewDueAt === null ? null : new Date(payload.reviewDueAt)
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'questionnaire_upload',
      entityId: updated.id,
      action: 'assign_review',
      metadata: {
        assignedReviewerUserId: updated.assignedReviewerUserId,
        assignedReviewerLabel: reviewer?.user.name ?? reviewer?.user.email ?? null,
        reviewDueAt: updated.reviewDueAt?.toISOString() ?? null
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_REVIEWER') {
      return badRequest('Assigned reviewer must be an active member of this tenant');
    }
    return handleRouteError(error);
  }
}
