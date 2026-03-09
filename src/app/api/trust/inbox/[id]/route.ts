import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { trustInboxUpdateSchema } from '@/lib/validation/trust';
import { handleRouteError, notFound, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const item = await prisma.trustInboxItem.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        questionnaireUpload: {
          include: {
            items: {
              include: {
                draftAnswers: {
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              },
              orderBy: { rowOrder: 'asc' }
            }
          }
        },
        attachments: {
          include: {
            evidence: {
              select: {
                id: true,
                name: true,
                mimeType: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!item) return notFound('Trust inbox item not found');

    const relatedEntityIds = [item.id];
    if (item.questionnaireUploadId) relatedEntityIds.push(item.questionnaireUploadId);

    const timeline = await prisma.auditLog.findMany({
      where: {
        tenantId: session.tenantId,
        entityId: { in: relatedEntityIds }
      },
      orderBy: { createdAt: 'desc' },
      take: 80
    });

    const suggestedDocs = await prisma.trustDoc.findMany({
      where: { tenantId: session.tenantId },
      include: {
        evidence: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({
      item,
      timeline,
      suggestedDocs
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = trustInboxUpdateSchema.parse(await request.json());

    const item = await prisma.trustInboxItem.findFirst({
      where: { id: params.id, tenantId: session.tenantId }
    });
    if (!item) return notFound('Trust inbox item not found');

    await prisma.$transaction(async (tx) => {
      await tx.trustInboxItem.update({
        where: { id: item.id },
        data: {
          status: payload.status,
          notes: payload.notes
        }
      });

      if (payload.attachmentEvidenceIds) {
        const evidence = await tx.evidence.findMany({
          where: {
            tenantId: session.tenantId,
            id: { in: payload.attachmentEvidenceIds }
          },
          select: { id: true }
        });

        const allowed = new Set(evidence.map((value) => value.id));
        const invalid = payload.attachmentEvidenceIds.filter((id) => !allowed.has(id));
        if (invalid.length) {
          throw new Error('INVALID_ATTACHMENT_EVIDENCE');
        }

        await tx.trustInboxAttachment.deleteMany({
          where: { tenantId: session.tenantId, inboxItemId: item.id }
        });

        if (payload.attachmentEvidenceIds.length) {
          await tx.trustInboxAttachment.createMany({
            data: payload.attachmentEvidenceIds.map((evidenceId) => ({
              tenantId: session.tenantId,
              inboxItemId: item.id,
              evidenceId,
              createdBy: session.userId
            }))
          });
        }
      }
    });

    const updated = await prisma.trustInboxItem.findUnique({
      where: { id: item.id },
      include: {
        attachments: {
          include: {
            evidence: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'trust_inbox_item',
      entityId: item.id,
      action: 'update',
      metadata: {
        status: updated?.status,
        attachmentCount: updated?.attachments.length ?? 0
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_ATTACHMENT_EVIDENCE') {
      return badRequest('One or more attachment evidence ids are invalid for this tenant');
    }
    return handleRouteError(error);
  }
}
