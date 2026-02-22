import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { buildReportExport } from '@/lib/report/export';
import { handleRouteError, notFound } from '@/lib/http';
import { requirePdfExportAccess } from '@/lib/billing/entitlements';
import { writeAuditLog } from '@/lib/audit';

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET(request: Request, { params }: { params: { reportId: string } }) {
  try {
    const session = await getSessionContext();
    const url = new URL(request.url);
    const formatQuery = (url.searchParams.get('format') ?? 'html').toLowerCase();
    const format = ['html', 'markdown', 'json', 'pdf'].includes(formatQuery)
      ? (formatQuery as 'html' | 'markdown' | 'json' | 'pdf')
      : 'html';

    if (format === 'pdf') {
      await requirePdfExportAccess(session.tenantId);
    }

    const report = await prisma.report.findFirst({
      where: { id: params.reportId, tenantId: session.tenantId }
    });

    if (!report) return notFound('Report not found');

    const branding = await prisma.tenantBranding.findUnique({
      where: { tenantId: session.tenantId }
    });

    const exportPayload = buildReportExport(report, branding, session.tenantName, format);

    const fileNameBase = `${toSlug(report.title)}-${new Date().toISOString().slice(0, 10)}`;
    const fileName = `${fileNameBase}.${exportPayload.extension}`;

    const exportRecord = await prisma.reportExport.create({
      data: {
        tenantId: session.tenantId,
        reportId: report.id,
        format: format === 'markdown' ? 'MARKDOWN' : format === 'json' ? 'JSON' : format === 'pdf' ? 'PDF' : 'HTML',
        storageKey: null,
        fileName,
        createdBy: session.userId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'report_export',
      entityId: exportRecord.id,
      action: 'create',
      metadata: {
        reportId: report.id,
        format,
        fileName
      }
    });

    return new Response(exportPayload.body, {
      headers: {
        'Content-Type': exportPayload.contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
