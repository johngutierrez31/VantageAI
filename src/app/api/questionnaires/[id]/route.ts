import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError, notFound } from '@/lib/http';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const upload = await prisma.questionnaireUpload.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      },
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
        items: {
          include: {
            _count: {
              select: {
                tasks: true,
                findings: true
              }
            },
            mappings: {
              orderBy: { updatedAt: 'desc' },
              include: {
                templateQuestion: {
                  select: {
                    id: true,
                    prompt: true
                  }
                }
              }
            },
            draftAnswers: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          orderBy: { rowOrder: 'asc' }
        },
        trustInboxItem: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    if (!upload) return notFound('Questionnaire upload not found');
    return NextResponse.json(upload);
  } catch (error) {
    return handleRouteError(error);
  }
}
