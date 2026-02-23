import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { requireRole } from '@/lib/rbac/authorize';
import { indexEvidenceById } from '@/lib/evidence/ingestion';
import { handleRouteError } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');

    const evidence = await indexEvidenceById(session.tenantId, params.id);

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'evidence',
      entityId: evidence.id,
      action: 'index',
      metadata: {
        chunkCount: evidence.chunks.length
      }
    });

    return NextResponse.json({
      id: evidence.id,
      ingestionStatus: evidence.ingestionStatus,
      chunkCount: evidence.chunks.length
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
