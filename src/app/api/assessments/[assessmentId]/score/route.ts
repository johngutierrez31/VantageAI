import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { computeAssessmentScore } from '@/lib/scoring/engine';
import { handleRouteError, notFound } from '@/lib/http';

export async function GET(_: Request, { params }: { params: { assessmentId: string } }) {
  try {
    const session = await getSessionContext();

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.assessmentId, tenantId: session.tenantId }
    });
    if (!assessment) return notFound('Assessment not found');

    const responses = await prisma.response.findMany({
      where: { assessmentId: params.assessmentId, tenantId: session.tenantId },
      include: { question: { include: { control: true } } }
    });

    const score = computeAssessmentScore(
      responses.map((r) => ({
        domain: r.question.control.domain,
        controlCode: r.question.control.code,
        score: r.score ?? 0,
        weight: r.question.weight,
        confidence: r.confidence ?? 0.5
      }))
    );

    return NextResponse.json({
      ...score,
      totalResponses: responses.length,
      hasSufficientData: responses.length > 0
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
