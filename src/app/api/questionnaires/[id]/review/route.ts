import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { questionnaireReviewSchema } from '@/lib/validation/questionnaire';
import { deriveQuestionnaireUploadStatus } from '@/lib/trust/packets';
import { resolveTrustFindingsForQuestionnaireItem, syncTrustFinding } from '@/lib/trust/findings';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

async function computeUploadStatus(tenantId: string, questionnaireUploadId: string) {
  const items = await prisma.questionnaireItem.findMany({
    where: {
      tenantId,
      questionnaireUploadId
    },
    include: {
      draftAnswers: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  return deriveQuestionnaireUploadStatus(
    items
      .map((item) => item.draftAnswers[0])
      .filter((draft): draft is NonNullable<typeof draft> => Boolean(draft))
      .map((draft) => ({ status: draft.status })),
    items.length
  );
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = questionnaireReviewSchema.parse(await request.json());

    const upload = await prisma.questionnaireUpload.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      },
      include: {
        trustInboxItem: {
          select: {
            id: true
          }
        },
        items: {
          where: {
            id: payload.itemId
          },
          include: {
            draftAnswers: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          take: 1
        }
      }
    });

    if (!upload) return notFound('Questionnaire upload not found');
    const item = upload.items[0];
    if (!item) {
      return badRequest('questionnaire item is not part of this upload');
    }

    const latestDraft = item.draftAnswers[0];
    if (!latestDraft) {
      return badRequest('No draft answer exists for this questionnaire item');
    }

    const now = new Date();
    const nextStatus = payload.decision;
    const updatedDraft = await prisma.draftAnswer.update({
      where: { id: latestDraft.id },
      data: {
        status: nextStatus,
        reviewRequired: nextStatus !== 'APPROVED',
        reviewerNotes: payload.reviewerNotes,
        reviewedBy: session.userId,
        reviewedAt: now
      }
    });

    let approvedAnswerId: string | null = null;
    if (payload.decision === 'APPROVED' && payload.saveToLibrary !== false) {
      const scope = payload.libraryScope ?? 'TENANT_SPECIFIC';
      const approvedAnswer = await prisma.approvedAnswer.upsert({
        where: {
          tenantId_normalizedQuestion_scope: {
            tenantId: session.tenantId,
            normalizedQuestion: updatedDraft.normalizedQuestion,
            scope
          }
        },
        update: {
          questionText: item.questionText,
          answerText: updatedDraft.answerText,
          mappedControlIds: updatedDraft.mappedControlIds,
          supportingEvidenceIds: updatedDraft.supportingEvidenceIds,
          status: 'ACTIVE',
          reviewerUserId: session.userId,
          reviewedAt: now,
          sourceDraftAnswerId: updatedDraft.id,
          sourceQuestionnaireItemId: item.id,
          sourceQuestionnaireUploadId: upload.id
        },
        create: {
          tenantId: session.tenantId,
          normalizedQuestion: updatedDraft.normalizedQuestion,
          questionText: item.questionText,
          answerText: updatedDraft.answerText,
          mappedControlIds: updatedDraft.mappedControlIds,
          supportingEvidenceIds: updatedDraft.supportingEvidenceIds,
          status: 'ACTIVE',
          scope,
          sourceDraftAnswerId: updatedDraft.id,
          sourceQuestionnaireItemId: item.id,
          sourceQuestionnaireUploadId: upload.id,
          ownerUserId: upload.assignedReviewerUserId,
          reviewerUserId: session.userId,
          reviewedAt: now,
          createdBy: session.userId
        }
      });
      approvedAnswerId = approvedAnswer.id;

      await writeAuditLog({
        tenantId: session.tenantId,
        actorUserId: session.userId,
        entityType: 'approved_answer',
        entityId: approvedAnswer.id,
        action: 'upsert',
        metadata: {
          questionnaireUploadId: upload.id,
          questionnaireItemId: item.id,
          scope
        }
      });
    }

    if (payload.decision === 'APPROVED') {
      await resolveTrustFindingsForQuestionnaireItem({
        tenantId: session.tenantId,
        questionnaireItemId: item.id,
        sourceType: 'TRUSTOPS_REJECTION'
      });

      if (updatedDraft.supportingEvidenceIds.length > 0) {
        await resolveTrustFindingsForQuestionnaireItem({
          tenantId: session.tenantId,
          questionnaireItemId: item.id,
          sourceType: 'TRUSTOPS_EVIDENCE_GAP'
        });
      }
    }

    if (payload.decision === 'REJECTED') {
      const finding = await syncTrustFinding({
        tenantId: session.tenantId,
        sourceType: 'TRUSTOPS_REJECTION',
        questionnaireUploadId: upload.id,
        questionnaireItemId: item.id,
        ownerUserId: upload.assignedReviewerUserId ?? null,
        createdBy: session.userId,
        title: `Rejected TrustOps answer for ${item.rowKey}`,
        description: [
          `Question: ${item.questionText}`,
          `Review notes: ${payload.reviewerNotes}`,
          updatedDraft.reviewReason ? `Original review reason: ${updatedDraft.reviewReason}` : null,
          'Reviewer rejected this answer for additional evidence, wording changes, or commitment control.'
        ]
          .filter(Boolean)
          .join('\n'),
        controlCode: null,
        supportStrength: updatedDraft.supportingEvidenceIds.length ? 'WEAK' : 'MISSING',
        priority: 'HIGH'
      });

      await writeAuditLog({
        tenantId: session.tenantId,
        actorUserId: session.userId,
        entityType: 'finding',
        entityId: finding.id,
        action: 'sync',
        metadata: {
          questionnaireUploadId: upload.id,
          questionnaireItemId: item.id,
          source: 'questionnaire_review_rejected'
        }
      });
    }

    const uploadStatus = await computeUploadStatus(session.tenantId, upload.id);
    await prisma.questionnaireUpload.update({
      where: { id: upload.id },
      data: {
        status: uploadStatus,
        reviewerUserId: session.userId,
        reviewedAt: now
      }
    });

    if (upload.trustInboxItem?.id) {
      await prisma.trustInboxItem.update({
        where: { id: upload.trustInboxItem.id },
        data: {
          status: uploadStatus === 'APPROVED' ? 'DRAFT_READY' : 'IN_REVIEW'
        }
      });
    }

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'draft_answer',
      entityId: updatedDraft.id,
      action: payload.decision.toLowerCase(),
      metadata: {
        questionnaireUploadId: upload.id,
        questionnaireItemId: item.id,
        uploadStatus,
        approvedAnswerId,
        saveToLibrary: payload.decision === 'APPROVED' ? payload.saveToLibrary !== false : false,
        libraryScope: payload.libraryScope ?? null
      }
    });

    return NextResponse.json({
      questionnaireId: upload.id,
      itemId: item.id,
      uploadStatus,
      draft: updatedDraft
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
