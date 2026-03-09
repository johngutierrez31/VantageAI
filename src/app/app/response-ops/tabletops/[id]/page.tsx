import { TabletopDetailPanel } from '@/components/app/tabletop-detail-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';

export default async function TabletopDetailPage({ params }: { params: { id: string } }) {
  const session = await getPageSessionContext();
  const tabletop = await prisma.tabletopExercise.findFirstOrThrow({
    where: { tenantId: session.tenantId, id: params.id },
    include: {
      tasks: { orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }] },
      findings: { orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }] }
    }
  });
  const risks = await prisma.riskRegisterItem.findMany({
    where: { tenantId: session.tenantId, linkedTabletopIds: { has: tabletop.id } },
    orderBy: [{ severity: 'desc' }, { targetDueAt: 'asc' }, { updatedAt: 'desc' }]
  });

  return (
    <TabletopDetailPanel
      tabletop={{
        id: tabletop.id,
        title: tabletop.title,
        scenarioType: tabletop.scenarioType,
        status: tabletop.status,
        exerciseDate: tabletop.exerciseDate.toISOString(),
        participantNames: tabletop.participantNames,
        participantRoles: tabletop.participantRoles,
        scenarioSummary: tabletop.scenarioSummary,
        exerciseObjectives: tabletop.exerciseObjectives,
        expectedDecisions: tabletop.expectedDecisions,
        exerciseNotes: tabletop.exerciseNotes,
        decisionsMade: tabletop.decisionsMade,
        gapsIdentified: tabletop.gapsIdentified,
        followUpActions: tabletop.followUpActions,
        reviewerNotes: tabletop.reviewerNotes,
        tasks: tabletop.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate?.toISOString() ?? null
        })),
        findings: tabletop.findings.map((finding) => ({
          id: finding.id,
          title: finding.title,
          status: finding.status,
          priority: finding.priority,
          sourceType: finding.sourceType
        }))
      }}
      risks={risks.map((risk) => ({
        id: risk.id,
        title: risk.title,
        severity: risk.severity,
        status: risk.status,
        targetDueAt: risk.targetDueAt?.toISOString() ?? null
      }))}
    />
  );
}
