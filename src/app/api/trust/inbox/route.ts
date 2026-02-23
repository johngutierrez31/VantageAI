import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { trustInboxCreateSchema } from '@/lib/validation/trust';
import { handleRouteError, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getSessionContext();
    const items = await prisma.trustInboxItem.findMany({
      where: { tenantId: session.tenantId },
      include: {
        questionnaireUpload: {
          select: {
            id: true,
            filename: true
          }
        },
        _count: {
          select: {
            attachments: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 200
    });

    return NextResponse.json(items);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = trustInboxCreateSchema.parse(await request.json());

    if (payload.questionnaireUploadId) {
      const upload = await prisma.questionnaireUpload.findFirst({
        where: { id: payload.questionnaireUploadId, tenantId: session.tenantId }
      });
      if (!upload) return badRequest('questionnaireUploadId is not valid for this tenant');
    }

    const item = await prisma.trustInboxItem.create({
      data: {
        tenantId: session.tenantId,
        title: payload.title,
        requesterEmail: payload.requesterEmail,
        questionnaireUploadId: payload.questionnaireUploadId,
        notes: payload.notes,
        createdBy: session.userId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'trust_inbox_item',
      entityId: item.id,
      action: 'create',
      metadata: {
        status: item.status,
        questionnaireUploadId: item.questionnaireUploadId
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
