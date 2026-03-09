import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { buildSuiteExportBaseName } from '@/lib/export/file-names';
import { handleRouteError } from '@/lib/http';
import {
  buildAfterActionExportPayload,
  renderAfterActionHtml,
  renderAfterActionMarkdown
} from '@/lib/response-ops/export';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: Request, { params }: { params: { reportId: string } }) {
  try {
    const session = await getSessionContext();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'html';

    const report = await prisma.afterActionReport.findFirstOrThrow({
      where: {
        tenantId: session.tenantId,
        id: params.reportId
      },
      include: {
        incident: {
          select: {
            title: true,
            incidentType: true,
            severity: true,
            status: true,
            startedAt: true,
            resolvedAt: true
          }
        }
      }
    });

    if (report.status !== 'APPROVED') {
      return NextResponse.json({ error: 'After-action report must be approved before export.' }, { status: 409 });
    }

    const payload = buildAfterActionExportPayload(report);
    const fileBase = buildSuiteExportBaseName(
      'after-action',
      report.title,
      report.incident.title
    );

    let body: string;
    let contentType: string;
    let extension: string;

    if (format === 'json') {
      body = `${JSON.stringify(payload, null, 2)}\n`;
      contentType = 'application/json';
      extension = 'json';
    } else if (format === 'markdown') {
      body = renderAfterActionMarkdown(report);
      contentType = 'text/markdown; charset=utf-8';
      extension = 'md';
    } else {
      body = renderAfterActionHtml(report);
      contentType = 'text/html; charset=utf-8';
      extension = 'html';
    }

    await prisma.afterActionReport.update({
      where: { id: report.id },
      data: {
        lastExportedAt: new Date(),
        exportCount: { increment: 1 }
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'after_action_report',
      entityId: report.id,
      action: 'after_action_exported',
      metadata: {
        format
      }
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileBase}.${extension}"`
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
