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

  const [
    templates,
    assessments,
    controls,
    questionnaireUploads,
    trustInboxItems,
    expiringExceptions,
    staleEvidenceCount,
    pendingIntakes,
    activeUser
  ] =
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
      prisma.questionnaireUpload.findMany({
        where: { tenantId: session.tenantId },
        select: { id: true, filename: true },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.trustInboxItem.findMany({
        where: { tenantId: session.tenantId },
        select: { id: true, title: true, status: true },
        orderBy: { updatedAt: 'desc' },
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
      prisma.trustInboxItem.count({
        where: {
          tenantId: session.tenantId,
          status: { in: ['NEW', 'IN_REVIEW'] }
        }
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
    })),
    ...questionnaireUploads.map((upload) => ({
      id: `questionnaire-${upload.id}`,
      label: upload.filename,
      description: 'Questionnaire upload',
      href: `/app/questionnaires/${upload.id}`,
      kind: 'questionnaire' as const
    })),
    ...trustInboxItems.map((item) => ({
      id: `trust-${item.id}`,
      label: item.title,
      description: `Trust inbox (${item.status})`,
      href: `/app/trust/inbox/${item.id}`,
      kind: 'trust' as const
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
      detail: pendingIntakes > 0 ? `${pendingIntakes} intake item(s) pending review.` : 'No pending imports.',
      href: '/app/questionnaires'
    },
    {
      id: 'trust-inbox',
      title: 'Trust inbox',
      detail:
        trustInboxItems.length > 0
          ? `${trustInboxItems.filter((item) => item.status !== 'DELIVERED').length} trust intake item(s) are open.`
          : 'No trust intake items.',
      href: '/app/trust/inbox'
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
