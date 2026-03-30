import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { ragGenerateSchema } from '@/lib/validation/evidence';
import { runRagForQuestion } from '@/lib/evidence/rag';
import { handleRouteError, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: Request, { params }: { params: { assessmentId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');

    const payload = ragGenerateSchema.parse(await request.json());

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

    if (!question) return notFound('Question not found for this assessment');

    const rag = await runRagForQuestion(session.tenantId, question.prompt);

    const suggestion = await prisma.aISuggestion.create({
      data: {
        tenantId: session.tenantId,
        assessmentId: assessment.id,
        questionId: question.id,
        type: 'RAG_DRAFT_ANSWER',
        prompt: rag.prompt,
        output: {
          answer: rag.answer,
          citations: rag.citations
        },
        citations: rag.citations.map((citation) => citation.evidenceId),
        createdBy: session.userId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'ai_suggestion',
      entityId: suggestion.id,
      action: 'rag_generate',
      metadata: {
        assessmentId: assessment.id,
        questionId: question.id,
        citationCount: rag.citations.length
      }
    });

    return NextResponse.json({
      suggestionId: suggestion.id,
      answer: rag.answer,
      citations: rag.citations
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
