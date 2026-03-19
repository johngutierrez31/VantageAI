import { getPageSessionContext } from '@/lib/auth/page-session';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import { prisma } from '@/lib/db/prisma';
import { ReportsHub } from '@/components/app/reports-hub';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export default async function ReportsPage() {
  const session = await getPageSessionContext();
  const [entitlements, workspace, reports] = await Promise.all([
    getTenantEntitlements(session.tenantId),
    getTenantWorkspaceContext(session.tenantId),
    prisma.report.findMany({
      where: { tenantId: session.tenantId },
      include: {
        assessment: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 40
    })
  ]);

  return (
    <ReportsHub
      canExportPdf={entitlements.limits.canExportPdf}
      isDemo={workspace.isDemo}
      reports={reports.map((report) => ({
        id: report.id,
        title: report.title,
        assessmentName: report.assessment.name,
        createdAt: report.createdAt.toISOString()
      }))}
    />
  );
}
