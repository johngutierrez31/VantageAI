import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { buildEvidenceMapDraft } from '@/lib/trust/evidence-map';
import { handleRouteError, notFound, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const evidenceMap = await prisma.evidenceMap.findFirst({
      where: {
        tenantId: session.tenantId,
        questionnaireUploadId: params.id
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!evidenceMap) return notFound('Evidence map not found');
    return NextResponse.json(evidenceMap);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');

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
          include: {
            draftAnswers: {
              orderBy: { createdAt: 'desc' },
              take: 1
            },
            tasks: {
              where: {
                status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] }
              },
              select: {
                id: true
              }
            },
            findings: {
              where: {
                status: { in: ['OPEN', 'IN_PROGRESS'] }
              },
              select: {
                id: true
              }
            }
          },
          orderBy: { rowOrder: 'asc' }
        }
      }
    });

    if (!upload) return notFound('Questionnaire upload not found');
    if (!upload.items.length) {
      return badRequest('Questionnaire has no items to map');
    }

    const draft = buildEvidenceMapDraft({
      questionnaireName: upload.filename,
      organizationName: upload.organizationName,
      items: upload.items.map((item) => ({
        questionnaireItemId: item.id,
        rowKey: item.rowKey,
        questionText: item.questionText,
        normalizedQuestion: item.normalizedQuestion,
        ownerIds: [upload.assignedReviewerUserId, upload.reviewerUserId].filter((value): value is string => Boolean(value)),
        openTaskIds: item.tasks.map((task) => task.id),
        openFindingIds: item.findings.map((finding) => finding.id),
        draft: item.draftAnswers[0]
          ? {
              status: item.draftAnswers[0].status,
              answerText: item.draftAnswers[0].answerText,
              confidenceScore: item.draftAnswers[0].confidenceScore,
              mappedControlIds: item.draftAnswers[0].mappedControlIds,
              supportingEvidenceIds: item.draftAnswers[0].supportingEvidenceIds
            }
          : null
      }))
    });

    const existing = await prisma.evidenceMap.findUnique({
      where: {
        questionnaireUploadId: upload.id
      }
    });

    const evidenceMap = await prisma.$transaction(async (tx) => {
      const map = existing
        ? await tx.evidenceMap.update({
            where: { id: existing.id },
            data: {
              name: draft.name,
              status: existing.status === 'APPROVED' ? 'NEEDS_REVIEW' : draft.status,
              trustInboxItemId: upload.trustInboxItem?.id ?? null
            }
          })
        : await tx.evidenceMap.create({
            data: {
              tenantId: session.tenantId,
              questionnaireUploadId: upload.id,
              trustInboxItemId: upload.trustInboxItem?.id ?? null,
              name: draft.name,
              status: draft.status,
              assignedReviewerUserId: upload.assignedReviewerUserId,
              reviewDueAt: upload.reviewDueAt,
              createdBy: session.userId
            }
          });

      await tx.evidenceMapItem.deleteMany({
        where: {
          tenantId: session.tenantId,
          evidenceMapId: map.id
        }
      });

      for (const item of draft.items) {
        await tx.evidenceMapItem.create({
          data: {
            tenantId: session.tenantId,
            evidenceMapId: map.id,
            questionnaireItemId: item.questionnaireItemId,
            questionCluster: item.questionCluster,
            normalizedQuestion: item.normalizedQuestion,
            relatedControlIds: item.relatedControlIds,
            evidenceArtifactIds: item.evidenceArtifactIds,
            ownerIds: item.ownerIds,
            supportStrength: item.supportStrength,
            buyerSafeSummary: item.buyerSafeSummary,
            recommendedNextAction: item.recommendedNextAction,
            relatedTaskId: item.relatedTaskId,
            relatedFindingId: item.relatedFindingId
          }
        });
      }

      return tx.evidenceMap.findUniqueOrThrow({
        where: { id: map.id },
        include: {
          items: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'evidence_map',
      entityId: evidenceMap.id,
      action: existing ? 'refresh' : 'create',
      metadata: {
        questionnaireUploadId: upload.id,
        trustInboxItemId: upload.trustInboxItem?.id ?? null,
        itemCount: evidenceMap.items.length,
        status: evidenceMap.status
      }
    });

    return NextResponse.json(evidenceMap, { status: existing ? 200 : 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
