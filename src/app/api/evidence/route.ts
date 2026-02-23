import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { evidenceCreateSchema } from '@/lib/validation/evidence';
import { ingestEvidenceText } from '@/lib/evidence/ingestion';
import { writeAuditLog } from '@/lib/audit';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import { handleRouteError, paymentRequired } from '@/lib/http';

export async function GET() {
  try {
    const session = await getSessionContext();
    const evidence = await prisma.evidence.findMany({
      where: { tenantId: session.tenantId },
      include: { chunks: { select: { id: true } }, links: { select: { id: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(
      evidence.map((item) => ({
        id: item.id,
        name: item.name,
        tags: item.tags,
        mimeType: item.mimeType,
        ingestionStatus: item.ingestionStatus,
        createdAt: item.createdAt,
        chunkCount: item.chunks.length,
        linkCount: item.links.length
      }))
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');

    const entitlements = await getTenantEntitlements(session.tenantId);
    const count = await prisma.evidence.count({ where: { tenantId: session.tenantId } });
    if (count >= entitlements.limits.evidenceFilesMax) {
      return paymentRequired('Evidence vault item limit reached for current plan');
    }

    const payload = evidenceCreateSchema.parse(await request.json());
    const evidence = await ingestEvidenceText({
      tenantId: session.tenantId,
      userId: session.userId,
      name: payload.name,
      content: payload.content,
      mimeType: payload.mimeType,
      tags: payload.tags,
      sourceUri: payload.sourceUri
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'evidence',
      entityId: evidence.id,
      action: 'ingest',
      metadata: {
        chunkCount: evidence.chunks.length,
        sourceUri: payload.sourceUri ?? null
      }
    });

    return NextResponse.json(
      {
        id: evidence.id,
        name: evidence.name,
        ingestionStatus: evidence.ingestionStatus,
        chunkCount: evidence.chunks.length
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

