import { Prisma } from '@prisma/client';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { buildTrustPacketManifest, renderTrustPacketHtml, renderTrustPacketMarkdown } from '@/lib/trust/package-export';
import { buildSuiteExportBaseName } from '@/lib/export/file-names';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') ?? 'html').toLowerCase();

    const packet = await prisma.trustPacket.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      },
      include: {
        questionnaireUpload: {
          include: {
            items: {
              include: {
                draftAnswers: {
                  where: { status: 'APPROVED' },
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              },
              orderBy: { rowOrder: 'asc' }
            }
          }
        },
        evidenceMap: {
          include: {
            items: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });

    if (!packet) return notFound('Trust packet not found');
    if (packet.shareMode === 'EXTERNAL_SHARE' && !['READY_TO_SHARE', 'SHARED'].includes(packet.status)) {
      return badRequest('External-share trust packets must be approved before export');
    }

    const trustDocs = await prisma.trustDoc.findMany({
      where: {
        tenantId: session.tenantId,
        evidenceId: {
          in: packet.includedArtifactIds
        }
      },
      include: {
        evidence: {
          select: {
            name: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const approvedRows = (packet.questionnaireUpload?.items ?? [])
      .map((item) => ({
        rowKey: item.rowKey,
        questionText: item.questionText,
        answerText: item.draftAnswers[0]?.answerText ?? '',
        confidenceScore: item.draftAnswers[0]?.confidenceScore ?? 0,
        supportingEvidenceIds: item.draftAnswers[0]?.supportingEvidenceIds ?? [],
        mappedControlIds: item.draftAnswers[0]?.mappedControlIds ?? []
      }))
      .filter((item) => item.answerText);

    const canIncludeEvidenceMap =
      packet.shareMode === 'INTERNAL_REVIEW' || packet.evidenceMap?.status === 'APPROVED';

    const manifest = buildTrustPacketManifest({
      packetName: packet.name,
      shareMode: packet.shareMode,
      status: packet.status,
      reviewerRequired: packet.reviewerRequired,
      organizationName: packet.questionnaireUpload?.organizationName,
      approvedContactName: packet.approvedContactName,
      approvedContactEmail: packet.approvedContactEmail,
      approvedRows,
      evidenceMapStatus: canIncludeEvidenceMap ? packet.evidenceMap?.status ?? null : 'withheld',
      evidenceMapItems: canIncludeEvidenceMap
        ? packet.evidenceMap?.items.map((item) => ({
            questionCluster: item.questionCluster,
            supportStrength: item.supportStrength,
            buyerSafeSummary: item.buyerSafeSummary,
            recommendedNextAction: item.recommendedNextAction,
            relatedControlIds: item.relatedControlIds,
            evidenceArtifactIds: item.evidenceArtifactIds
          }))
        : [],
      trustDocs: trustDocs.map((doc) => ({
        category: doc.category,
        evidenceName: doc.evidence.name,
        createdAt: doc.evidence.createdAt.toISOString()
      })),
      staleArtifactIds: packet.staleArtifactIds,
      includeAiGovernanceSummary: trustDocs.some((doc) => /ai/i.test(doc.category))
    });

    const fileNameBase = buildSuiteExportBaseName(
      'trust-packet',
      packet.name,
      packet.questionnaireUpload?.organizationName ?? packet.questionnaireUpload?.filename ?? null
    );
    let body = '';
    let contentType = 'application/json; charset=utf-8';
    let extension = 'json';

    if (format === 'markdown' || format === 'md') {
      body = renderTrustPacketMarkdown(manifest);
      contentType = 'text/markdown; charset=utf-8';
      extension = 'md';
    } else if (format === 'html') {
      body = renderTrustPacketHtml(manifest);
      contentType = 'text/html; charset=utf-8';
      extension = 'html';
    } else {
      body = `${JSON.stringify(manifest, null, 2)}\n`;
    }

    await prisma.trustPacket.update({
      where: { id: packet.id },
      data: {
        packageManifestJson: manifest as Prisma.InputJsonValue,
        lastExportedAt: new Date(),
        exportCount: {
          increment: 1
        },
        reviewerRequired: packet.shareMode === 'EXTERNAL_SHARE' ? false : packet.reviewerRequired,
        status: packet.shareMode === 'EXTERNAL_SHARE' ? 'SHARED' : packet.status
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'trust_packet',
      entityId: packet.id,
      action: 'export',
      metadata: {
        format,
        shareMode: packet.shareMode,
        externalShare: packet.shareMode === 'EXTERNAL_SHARE'
      }
    });

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileNameBase}.${extension}"`
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
