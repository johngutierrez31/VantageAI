import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { evidenceLinkSchema } from '@/lib/validation/evidence';
import { handleRouteError, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: Request, { params }: { params: { assessmentId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ANALYST');
    const payload = evidenceLinkSchema.parse(await request.json());

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.assessmentId, tenantId: session.tenantId }
    });
    if (!assessment) return notFound('Assessment not found');

    const evidence = await prisma.evidence.findFirst({
      where: { id: payload.evidenceId, tenantId: session.tenantId }
    });
    if (!evidence) return notFound('Evidence not found');

    if (payload.questionId) {
      const question = await prisma.question.findFirst({
        where: {
          id: payload.questionId,
          tenantId: session.tenantId,
          control: { templateVersionId: assessment.templateVersionId }
        }
      });

      if (!question) return notFound('Question not found for this assessment');
    }

    if (payload.responseId) {
      const response = await prisma.response.findFirst({
        where: {
          id: payload.responseId,
          tenantId: session.tenantId,
          assessmentId: assessment.id
        }
      });

      if (!response) return notFound('Response not found for this assessment');
    }

    const link = await prisma.evidenceLink.create({
      data: {
        tenantId: session.tenantId,
        evidenceId: payload.evidenceId,
        questionId: payload.questionId,
        responseId: payload.responseId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'evidence_link',
      entityId: link.id,
      action: 'create',
      metadata: {
        assessmentId: assessment.id,
        evidenceId: payload.evidenceId,
        questionId: payload.questionId ?? null,
        responseId: payload.responseId ?? null
      }
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
