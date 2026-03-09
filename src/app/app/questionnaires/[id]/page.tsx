import { notFound } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { QuestionnaireDetailPanel } from '@/components/app/questionnaire-detail-panel';
import { listTenantReviewers } from '@/lib/trust/reviewers';

export default async function QuestionnaireDetailPage({ params }: { params: { id: string } }) {
  const session = await getPageSessionContext();
  const [upload, templates, reviewers] = await Promise.all([
    prisma.questionnaireUpload.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        evidenceMap: {
          include: {
            _count: {
              select: {
                items: true
              }
            }
          }
        },
        trustInboxItem: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        items: {
          include: {
            _count: {
              select: {
                tasks: true,
                findings: true
              }
            },
            mappings: {
              include: {
                templateQuestion: {
                  select: {
                    id: true,
                    prompt: true,
                    control: {
                      select: {
                        code: true
                      }
                    }
                  }
                }
              },
              orderBy: { updatedAt: 'desc' },
              take: 1
            },
            draftAnswers: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          orderBy: { rowOrder: 'asc' }
        }
      }
    }),
    prisma.template.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, name: true },
      orderBy: { updatedAt: 'desc' }
    }),
    listTenantReviewers(session.tenantId)
  ]);

  if (!upload) notFound();

  return (
    <QuestionnaireDetailPanel
      questionnaireId={upload.id}
      filename={upload.filename}
      organizationName={upload.organizationName}
      status={upload.status}
      assignedReviewerUserId={upload.assignedReviewerUserId}
      reviewDueAt={upload.reviewDueAt?.toISOString() ?? null}
      reviewedAt={upload.reviewedAt?.toISOString() ?? null}
      trustInboxItem={upload.trustInboxItem}
      evidenceMap={
        upload.evidenceMap
          ? {
              id: upload.evidenceMap.id,
              status: upload.evidenceMap.status,
              reviewDueAt: upload.evidenceMap.reviewDueAt?.toISOString() ?? null,
              itemCount: upload.evidenceMap._count.items
            }
          : null
      }
      templates={templates}
      reviewers={reviewers.map((reviewer) => ({
        id: reviewer.userId,
        label: reviewer.user.name ?? reviewer.user.email
      }))}
      items={upload.items.map((item) => ({
        id: item.id,
        rowKey: item.rowKey,
        rowOrder: item.rowOrder,
        questionText: item.questionText,
        normalizedQuestion: item.normalizedQuestion,
        openTaskCount: item._count.tasks,
        openFindingCount: item._count.findings,
        mappings: item.mappings.map((mapping) => ({
          confidence: mapping.confidence,
          status: mapping.status,
          templateQuestion: mapping.templateQuestion
            ? {
                id: mapping.templateQuestion.id,
                prompt: mapping.templateQuestion.prompt,
                controlCode: mapping.templateQuestion.control.code
              }
            : null
        })),
        draftAnswers: item.draftAnswers.map((draft) => ({
          id: draft.id,
          answerText: draft.answerText,
          model: draft.model,
          confidenceScore: draft.confidenceScore,
          reviewRequired: draft.reviewRequired,
          status: draft.status,
          reviewReason: draft.reviewReason,
          notesForReviewer: draft.notesForReviewer,
          reviewerNotes: draft.reviewerNotes,
          mappedControlIds: draft.mappedControlIds,
          supportingEvidenceIds: draft.supportingEvidenceIds
        }))
      }))}
    />
  );
}
