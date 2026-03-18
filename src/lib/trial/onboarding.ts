import { prisma } from '@/lib/db/prisma';

export type TrialChecklistItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  completed: boolean;
  outputLabel: string;
};

export async function getTenantTrialOnboarding(tenantId: string) {
  const [questionnaireCount, pulseSnapshotCount, aiUseCaseCount, incidentCount, tabletopCount, evidenceCount, trustDocCount] =
    await Promise.all([
      prisma.questionnaireUpload.count({ where: { tenantId } }),
      prisma.pulseSnapshot.count({ where: { tenantId } }),
      prisma.aIUseCase.count({ where: { tenantId } }),
      prisma.incident.count({ where: { tenantId } }),
      prisma.tabletopExercise.count({ where: { tenantId } }),
      prisma.evidence.count({ where: { tenantId } }),
      prisma.trustDoc.count({ where: { tenantId } })
    ]);

  const items: TrialChecklistItem[] = [
    {
      id: 'trustops',
      title: 'Answer or import your first questionnaire',
      description: 'Start the buyer diligence workflow and turn a live questionnaire into approved answers, evidence links, and next actions.',
      href: '/app/questionnaires',
      actionLabel: 'Open Questionnaires',
      completed: questionnaireCount > 0,
      outputLabel: 'A tenant-scoped questionnaire record with reviewable answer work.'
    },
    {
      id: 'pulse',
      title: 'Generate your first Pulse snapshot',
      description: 'Create the executive scorecard that turns current trust, finding, AI, and incident signals into one posture view.',
      href: '/app/pulse',
      actionLabel: 'Open Pulse',
      completed: pulseSnapshotCount > 0,
      outputLabel: 'A persisted posture snapshot with linked risks and roadmap follow-up.'
    },
    {
      id: 'ai-governance',
      title: 'Register your first AI use case',
      description: 'Review one AI workflow with policy fit, data classes, approval conditions, and downstream risk visibility.',
      href: '/app/ai-governance/use-cases',
      actionLabel: 'Open AI Governance',
      completed: aiUseCaseCount > 0,
      outputLabel: 'A governed AI record with approval state and review ownership.'
    },
    {
      id: 'response-ops',
      title: 'Start your first incident or tabletop workflow',
      description: 'Capture the first-hour response path or a tabletop exercise so follow-up work carries into findings and Pulse.',
      href: '/app/response-ops',
      actionLabel: 'Open Response Ops',
      completed: incidentCount > 0 || tabletopCount > 0,
      outputLabel: 'A durable incident or tabletop record with owned response follow-up.'
    },
    {
      id: 'evidence',
      title: 'Add your first evidence artifact',
      description: 'Upload a policy, evidence file, or trust document so later TrustOps, Pulse, and sharing workflows have real support.',
      href: '/app/evidence',
      actionLabel: 'Open Evidence',
      completed: evidenceCount > 0 || trustDocCount > 0,
      outputLabel: 'A reusable evidence artifact that can support answers, packets, and posture work.'
    }
  ];

  return {
    items,
    completedCount: items.filter((item) => item.completed).length,
    totalCount: items.length
  };
}
