import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { buildTrustPacketRecord } from '@/lib/trust/packets';
import { buildTrustPacketManifest } from '@/lib/trust/package-export';
import { trustPacketCreateSchema } from '@/lib/validation/trust';
import { handleRouteError, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getSessionContext();
    const packets = await prisma.trustPacket.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    return NextResponse.json(packets);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = trustPacketCreateSchema.parse(await request.json());

    let trustInboxItemId = payload.trustInboxItemId ?? null;
    let questionnaireUploadId = payload.questionnaireUploadId ?? null;

    if (trustInboxItemId) {
      const trustItem = await prisma.trustInboxItem.findFirst({
        where: {
          id: trustInboxItemId,
          tenantId: session.tenantId
        },
        select: {
          id: true,
          questionnaireUploadId: true
        }
      });
      if (!trustItem) {
        return badRequest('trustInboxItemId is not valid for this tenant');
      }
      questionnaireUploadId = questionnaireUploadId ?? trustItem.questionnaireUploadId ?? null;
      trustInboxItemId = trustItem.id;
    }

    if (questionnaireUploadId) {
      const upload = await prisma.questionnaireUpload.findFirst({
        where: {
          id: questionnaireUploadId,
          tenantId: session.tenantId
        },
        select: {
          id: true,
          organizationName: true,
          assignedReviewerUserId: true,
          reviewDueAt: true
        }
      });
      if (!upload) {
        return badRequest('questionnaireUploadId is not valid for this tenant');
      }
    }

    const [approvedRows, evidenceMap, trustDocs] = await Promise.all([
      questionnaireUploadId
        ? prisma.questionnaireItem.findMany({
            where: {
              tenantId: session.tenantId,
              questionnaireUploadId
            },
            include: {
              draftAnswers: {
                where: { status: 'APPROVED' },
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            },
            orderBy: { rowOrder: 'asc' }
          })
        : Promise.resolve([]),
      questionnaireUploadId
        ? prisma.evidenceMap.findFirst({
            where: {
              tenantId: session.tenantId,
              questionnaireUploadId
            },
            include: {
              items: {
                orderBy: { createdAt: 'asc' }
              }
            }
          })
        : Promise.resolve(null),
      prisma.trustDoc.findMany({
        where: { tenantId: session.tenantId },
        include: {
          evidence: {
            select: {
              id: true,
              name: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    const approvedDraftRows = approvedRows
      .map((item) => ({
        rowKey: item.rowKey,
        questionText: item.questionText,
        answerText: item.draftAnswers[0]?.answerText ?? '',
        confidenceScore: item.draftAnswers[0]?.confidenceScore ?? 0,
        supportingEvidenceIds: item.draftAnswers[0]?.supportingEvidenceIds ?? [],
        mappedControlIds: item.draftAnswers[0]?.mappedControlIds ?? []
      }))
      .filter((item) => item.answerText);

    if (!approvedDraftRows.length) {
      return badRequest('At least one approved questionnaire answer is required to assemble a trust packet');
    }

    const upload = questionnaireUploadId
      ? await prisma.questionnaireUpload.findFirst({
        where: { id: questionnaireUploadId, tenantId: session.tenantId },
          select: {
            organizationName: true,
            assignedReviewerUserId: true,
            reviewDueAt: true
          }
        })
      : null;

    const packetBase = buildTrustPacketRecord({
      packetName: payload.name,
      shareMode: payload.shareMode,
      approvedRows: approvedDraftRows,
      trustDocs,
      includeAiGovernanceSummary: trustDocs.some((doc) => /ai/i.test(doc.category)),
      organizationName: upload?.organizationName
    });

    const packet = {
      ...packetBase,
      status:
        payload.shareMode === 'EXTERNAL_SHARE' && evidenceMap && evidenceMap.status !== 'APPROVED'
          ? 'READY_FOR_REVIEW'
          : packetBase.status,
      reviewerRequired:
        packetBase.reviewerRequired || (payload.shareMode === 'EXTERNAL_SHARE' && evidenceMap?.status !== 'APPROVED')
    };

    const manifest = buildTrustPacketManifest({
      packetName: packet.name,
      shareMode: payload.shareMode,
      status: packet.status,
      reviewerRequired: packet.reviewerRequired,
      organizationName: upload?.organizationName,
      approvedContactName: payload.approvedContactName,
      approvedContactEmail: payload.approvedContactEmail,
      approvedRows: approvedDraftRows,
      evidenceMapStatus: evidenceMap?.status ?? null,
      evidenceMapItems: evidenceMap?.items.map((item) => ({
        questionCluster: item.questionCluster,
        supportStrength: item.supportStrength,
        buyerSafeSummary: item.buyerSafeSummary,
        recommendedNextAction: item.recommendedNextAction,
        relatedControlIds: item.relatedControlIds,
        evidenceArtifactIds: item.evidenceArtifactIds
      })),
      trustDocs: trustDocs.map((doc) => ({
        category: doc.category,
        evidenceName: doc.evidence.name,
        createdAt: doc.evidence.createdAt.toISOString()
      })),
      staleArtifactIds: packet.staleArtifactIds,
      includeAiGovernanceSummary: trustDocs.some((doc) => /ai/i.test(doc.category))
    });

    const created = await prisma.trustPacket.create({
      data: {
        tenantId: session.tenantId,
        trustInboxItemId,
        questionnaireUploadId,
        evidenceMapId: evidenceMap?.id ?? null,
        name: packet.name,
        status: packet.status,
        shareMode: packet.shareMode,
        packetSections: packet.packetSections,
        packageManifestJson: manifest as Prisma.InputJsonValue,
        includedArtifactIds: packet.includedArtifactIds,
        excludedArtifactIds: packet.excludedArtifactIds,
        staleArtifactIds: packet.staleArtifactIds,
        reviewerRequired: packet.reviewerRequired,
        assignedReviewerUserId: upload?.assignedReviewerUserId ?? null,
        reviewDueAt: upload?.reviewDueAt ?? null,
        approvedContactName: payload.approvedContactName ?? null,
        approvedContactEmail: payload.approvedContactEmail ?? null,
        createdBy: session.userId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'trust_packet',
      entityId: created.id,
      action: 'create',
      metadata: {
        trustInboxItemId,
        questionnaireUploadId,
        evidenceMapId: created.evidenceMapId,
        shareMode: created.shareMode,
        includedArtifactCount: created.includedArtifactIds.length,
        staleArtifactCount: created.staleArtifactIds.length
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
