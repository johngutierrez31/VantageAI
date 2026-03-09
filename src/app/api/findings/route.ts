import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError } from '@/lib/http';

export async function GET() {
  try {
    const session = await getSessionContext();
    const findings = await prisma.finding.findMany({
      where: {
        tenantId: session.tenantId
      },
      include: {
        questionnaireUpload: {
          select: {
            id: true,
            filename: true,
            organizationName: true
          }
        },
        evidenceMap: {
          select: {
            id: true,
            name: true
          }
        },
        aiUseCase: {
          select: {
            id: true,
            name: true
          }
        },
        aiVendorReview: {
          select: {
            id: true,
            vendorName: true,
            productName: true
          }
        },
        incident: {
          select: {
            id: true,
            title: true
          }
        },
        tabletopExercise: {
          select: {
            id: true,
            title: true
          }
        },
        task: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
      take: 200
    });

    return NextResponse.json(findings);
  } catch (error) {
    return handleRouteError(error);
  }
}
