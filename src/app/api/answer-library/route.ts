import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError } from '@/lib/http';

export async function GET(request: Request) {
  try {
    const session = await getSessionContext();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() ?? '';
    const scope = searchParams.get('scope')?.trim() ?? '';
    const status = searchParams.get('status')?.trim() ?? '';

    const answers = await prisma.approvedAnswer.findMany({
      where: {
        tenantId: session.tenantId,
        ...(scope ? { scope: scope as 'REUSABLE' | 'TENANT_SPECIFIC' } : {}),
        ...(status ? { status: status as 'ACTIVE' | 'ARCHIVED' } : {}),
        ...(query
          ? {
              OR: [
                { normalizedQuestion: { contains: query, mode: 'insensitive' } },
                { questionText: { contains: query, mode: 'insensitive' } },
                { answerText: { contains: query, mode: 'insensitive' } }
              ]
            }
          : {})
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
    });

    return NextResponse.json(answers);
  } catch (error) {
    return handleRouteError(error);
  }
}
