import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { listAdoptionImports, importAdoptionRecords } from '@/lib/adoption/imports';
import { adoptionImportSchema } from '@/lib/validation/adoption';

export async function GET() {
  try {
    const session = await getSessionContext();
    const imports = await listAdoptionImports(session.tenantId);
    return NextResponse.json(imports);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    const payload = adoptionImportSchema.parse(await request.json());
    const imported = await importAdoptionRecords({
      tenantId: session.tenantId,
      userId: session.userId,
      input: payload
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'adoption_import',
      entityId: imported.record.id,
      action: 'adoption_import_completed',
      metadata: {
        target: imported.record.target,
        source: imported.record.source,
        status: imported.record.status,
        createdCount: imported.record.createdCount,
        failedCount: imported.record.failedCount,
        connectorId: imported.record.connectorId
      }
    });

    return NextResponse.json(imported, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'CONNECTOR_NOT_FOUND') {
      return badRequest('Connector-assisted import requires a valid tenant connector');
    }
    if (error instanceof Error && error.message === 'NO_IMPORT_ROWS') {
      return badRequest('No rows could be parsed from the supplied import content');
    }
    return handleRouteError(error);
  }
}
