import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { responsesPatchSchema } from '@/lib/validation/assessment';
import { handleRouteError, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function PATCH(request: Request, { params }: { params: { assessmentId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = responsesPatchSchema.parse(await request.json());

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.assessmentId, tenantId: session.tenantId }
    });

    if (!assessment) return notFound('Assessment not found');

    const questionIds = payload.responses.map((item) => item.questionId);
    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds },
        tenantId: session.tenantId,
        control: { templateVersionId: assessment.templateVersionId }
      },
      select: { id: true }
    });
    const allowed = new Set(questions.map((question) => question.id));

    const updated = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const response of payload.responses) {
        if (!allowed.has(response.questionId)) continue;
        const item = await tx.response.upsert({
          where: {
            assessmentId_questionId: {
              assessmentId: assessment.id,
              questionId: response.questionId
            }
          },
          update: {
            answer: response.answer,
            score: response.score,
            confidence: response.confidence,
            rationale: response.rationale,
            updatedBy: session.userId
          },
          create: {
            tenantId: session.tenantId,
            assessmentId: assessment.id,
            questionId: response.questionId,
            answer: response.answer,
            score: response.score,
            confidence: response.confidence,
            rationale: response.rationale,
            updatedBy: session.userId
          }
        });
        results.push(item);
      }
      return results;
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'assessment',
      entityId: assessment.id,
      action: 'responses_patch',
      metadata: {
        updatedCount: updated.length
      }
    });

    return NextResponse.json({
      assessmentId: assessment.id,
      updatedCount: updated.length
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
