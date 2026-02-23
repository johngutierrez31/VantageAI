import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { trustDocCreateSchema } from '@/lib/validation/trust';
import { handleRouteError, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getSessionContext();
    const docs = await prisma.trustDoc.findMany({
      where: { tenantId: session.tenantId },
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
    });

    return NextResponse.json(docs);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = trustDocCreateSchema.parse(await request.json());

    const evidence = await prisma.evidence.findFirst({
      where: { id: payload.evidenceId, tenantId: session.tenantId }
    });
    if (!evidence) return badRequest('Evidence file not found in this tenant');

    const trustDoc = await prisma.trustDoc.upsert({
      where: {
        tenantId_evidenceId: {
          tenantId: session.tenantId,
          evidenceId: evidence.id
        }
      },
      update: {
        category: payload.category,
        tagsJson: payload.tags ?? []
      },
      create: {
        tenantId: session.tenantId,
        category: payload.category,
        evidenceId: evidence.id,
        tagsJson: payload.tags ?? [],
        createdBy: session.userId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'trust_doc',
      entityId: trustDoc.id,
      action: 'upsert',
      metadata: {
        evidenceId: evidence.id,
        category: trustDoc.category
      }
    });

    return NextResponse.json(trustDoc, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
