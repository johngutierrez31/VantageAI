import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError } from '@/lib/http';

export async function GET() {
  try {
    const session = await getSessionContext();
    const uploads = await prisma.questionnaireUpload.findMany({
      where: { tenantId: session.tenantId },
      include: {
        _count: {
          select: {
            items: true
          }
        },
        trustInboxItem: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json(
      uploads.map((upload) => ({
        id: upload.id,
        filename: upload.filename,
        originalFormat: upload.originalFormat,
        createdAt: upload.createdAt,
        itemCount: upload._count.items,
        trustInboxItem: upload.trustInboxItem
      }))
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
