import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { ReportsHub } from '@/components/app/reports-hub';

export default async function ReportsPage() {
  const session = await getPageSessionContext();
  const reports = await prisma.report.findMany({
    where: { tenantId: session.tenantId },
    include: {
      assessment: {
        select: { name: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 40
  });

  return (
    <ReportsHub
      reports={reports.map((report) => ({
        id: report.id,
        title: report.title,
        assessmentName: report.assessment.name,
        createdAt: report.createdAt.toISOString()
      }))}
    />
  );
}
