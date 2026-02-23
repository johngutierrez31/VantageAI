import { addDays, subDays } from 'date-fns';
import { AppShell } from '@/components/app/app-shell';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { isDemoModeEnabled } from '@/lib/auth/demo';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPageSessionContext();
  const now = new Date();
  const soon = addDays(now, 30);
  const ninetyDaysAgo = subDays(now, 90);

  const [templates, assessments, controls, expiringExceptions, staleEvidenceCount, pendingImports, activeUser] =
    await Promise.all([
      prisma.template.findMany({
        where: { tenantId: session.tenantId },
        select: { id: true, name: true, status: true },
        orderBy: { updatedAt: 'desc' },
        take: 20
      }),
      prisma.assessment.findMany({
        where: { tenantId: session.tenantId },
        select: { id: true, name: true, customerName: true, status: true },
        orderBy: { updatedAt: 'desc' },
        take: 20
      }),
      prisma.control.findMany({
        where: { tenantId: session.tenantId },
        select: { id: true, code: true, title: true },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.exception.count({
        where: {
          tenantId: session.tenantId,
          dueDate: {
            gte: now,
            lte: soon
          }
        }
      }),
      prisma.evidence.count({
        where: { tenantId: session.tenantId, createdAt: { lt: ninetyDaysAgo } }
      }),
      prisma.questionnaireImport.count({
        where: { tenantId: session.tenantId, status: 'PENDING' }
      }),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true, name: true }
      })
    ]);

  const searchItems = [
    ...templates.map((template) => ({
      id: `template-${template.id}`,
      label: template.name,
      description: `Template (${template.status})`,
      href: `/app/templates/${template.id}`,
      kind: 'template' as const
    })),
    ...assessments.map((assessment) => ({
      id: `assessment-${assessment.id}`,
      label: assessment.name,
      description: `${assessment.customerName} (${assessment.status})`,
      href: `/app/assessments/${assessment.id}`,
      kind: 'assessment' as const
    })),
    ...controls.map((control) => ({
      id: `control-${control.id}`,
      label: `${control.code}: ${control.title}`,
      description: 'Control',
      href: '/app/findings',
      kind: 'control' as const
    }))
  ];

  const notifications = [
    {
      id: 'exceptions',
      title: 'Exceptions expiring soon',
      detail:
        expiringExceptions > 0
          ? `${expiringExceptions} accepted risks need review in the next 30 days.`
          : 'No accepted risks are near expiry.',
      href: '/app/findings'
    },
    {
      id: 'evidence-freshness',
      title: 'Evidence freshness',
      detail:
        staleEvidenceCount > 0
          ? `${staleEvidenceCount} evidence item(s) are older than 90 days.`
          : 'Evidence freshness is healthy.',
      href: '/app/evidence'
    },
    {
      id: 'questionnaire',
      title: 'Questionnaire inbox',
      detail: pendingImports > 0 ? `${pendingImports} imports are pending review.` : 'No pending imports.',
      href: '/app/questionnaires'
    }
  ];

  return (
    <AppShell
      tenantName={session.tenantName}
      tenantId={session.tenantId}
      memberships={session.memberships}
      role={session.role}
      demoMode={isDemoModeEnabled()}
      userLabel={activeUser?.name ?? activeUser?.email ?? session.userId}
      searchItems={searchItems}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
