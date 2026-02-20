import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { responseUpsertSchema } from '@/lib/validation/assessment';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError, notFound } from '@/lib/http';

export async function GET(_: Request, { params }: { params: { assessmentId: string } }) {
  try {
    const session = await getSessionContext();
    const assessment = await prisma.assessment.findFirst({
      where: { id: params.assessmentId, tenantId: session.tenantId },
      include: {
        responses: true,
        template: true
      }
    });

    if (!assessment) return notFound('Assessment not found');

    const questions = await prisma.question.findMany({
      where: {
        tenantId: session.tenantId,
        control: {
          templateVersionId: assessment.templateVersionId
        }
      },
      include: { control: true }
    });

    return NextResponse.json({ assessment, questions });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: { params: { assessmentId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ANALYST');
    const payload = responseUpsertSchema.parse(await request.json());

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.assessmentId, tenantId: session.tenantId }
    });
    if (!assessment) return notFound('Assessment not found');

    const question = await prisma.question.findFirst({
      where: {
        id: payload.questionId,
        tenantId: session.tenantId,
        control: { templateVersionId: assessment.templateVersionId }
      }
    });
    if (!question) return notFound('Question not found for this assessment/template version');

    const response = await prisma.response.upsert({
      where: {
        assessmentId_questionId: {
          assessmentId: params.assessmentId,
          questionId: payload.questionId
        }
      },
      update: {
        answer: payload.answer,
        score: payload.score,
        confidence: payload.confidence,
        rationale: payload.rationale,
        updatedBy: session.userId
      },
      create: {
        tenantId: session.tenantId,
        assessmentId: params.assessmentId,
        questionId: payload.questionId,
        answer: payload.answer,
        score: payload.score,
        confidence: payload.confidence,
        rationale: payload.rationale,
        updatedBy: session.userId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'response',
      entityId: response.id,
      action: 'upsert',
      metadata: { assessmentId: params.assessmentId, questionId: payload.questionId }
    });

    return NextResponse.json(response);
  } catch (error) {
    return handleRouteError(error);
  }
}
