import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { listTenantReviewers } from '@/lib/trust/reviewers';
import { AnswerLibraryPanel } from '@/components/app/answer-library-panel';

export default async function AnswerLibraryPage() {
  const session = await getPageSessionContext();
  const [answers, reviewers] = await Promise.all([
    prisma.approvedAnswer.findMany({
      where: {
        tenantId: session.tenantId
      },
      include: {
        sourceQuestionnaireUpload: {
          select: {
            id: true,
            filename: true,
            organizationName: true
          }
        }
      },
      orderBy: [{ usageCount: 'desc' }, { updatedAt: 'desc' }],
      take: 300
    }),
    listTenantReviewers(session.tenantId)
  ]);

  return (
    <AnswerLibraryPanel
      answers={answers.map((answer) => ({
        id: answer.id,
        normalizedQuestion: answer.normalizedQuestion,
        questionText: answer.questionText,
        answerText: answer.answerText,
        scope: answer.scope,
        status: answer.status,
        usageCount: answer.usageCount,
        lastUsedAt: answer.lastUsedAt?.toISOString() ?? null,
        reviewedAt: answer.reviewedAt?.toISOString() ?? null,
        ownerUserId: answer.ownerUserId,
        sourceQuestionnaireUpload: answer.sourceQuestionnaireUpload
          ? {
              id: answer.sourceQuestionnaireUpload.id,
              filename: answer.sourceQuestionnaireUpload.filename,
              organizationName: answer.sourceQuestionnaireUpload.organizationName
            }
          : null,
        mappedControlIds: answer.mappedControlIds,
        supportingEvidenceIds: answer.supportingEvidenceIds
      }))}
      reviewers={reviewers.map((reviewer) => ({
        id: reviewer.userId,
        label: reviewer.user.name ?? reviewer.user.email
      }))}
    />
  );
}
