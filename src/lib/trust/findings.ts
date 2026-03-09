import { prisma } from '@/lib/db/prisma';

type SyncTrustFindingArgs = {
  tenantId: string;
  sourceType: 'TRUSTOPS_EVIDENCE_GAP' | 'TRUSTOPS_REJECTION' | 'TRUSTOPS_EVIDENCE_MAP';
  questionnaireUploadId?: string | null;
  questionnaireItemId?: string | null;
  evidenceMapId?: string | null;
  evidenceMapItemId?: string | null;
  taskId?: string | null;
  ownerUserId?: string | null;
  createdBy: string;
  title: string;
  description: string;
  controlCode?: string | null;
  supportStrength?: 'STRONG' | 'MODERATE' | 'WEAK' | 'MISSING' | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
};

export async function syncTrustFinding(args: SyncTrustFindingArgs) {
  const existing = await prisma.finding.findFirst({
    where: {
      tenantId: args.tenantId,
      sourceType: args.sourceType,
      questionnaireItemId: args.questionnaireItemId ?? undefined,
      evidenceMapItemId: args.evidenceMapItemId ?? undefined,
      status: { in: ['OPEN', 'IN_PROGRESS'] }
    }
  });

  if (existing) {
    return prisma.finding.update({
      where: { id: existing.id },
      data: {
        title: args.title,
        description: args.description,
        controlCode: args.controlCode,
        supportStrength: args.supportStrength ?? undefined,
        ownerUserId: args.ownerUserId ?? undefined,
        taskId: args.taskId ?? undefined,
        evidenceMapId: args.evidenceMapId ?? undefined,
        priority: args.priority ?? undefined
      }
    });
  }

  return prisma.finding.create({
    data: {
      tenantId: args.tenantId,
      sourceType: args.sourceType,
      title: args.title,
      description: args.description,
      controlCode: args.controlCode,
      supportStrength: args.supportStrength ?? undefined,
      ownerUserId: args.ownerUserId ?? undefined,
      questionnaireUploadId: args.questionnaireUploadId ?? undefined,
      questionnaireItemId: args.questionnaireItemId ?? undefined,
      evidenceMapId: args.evidenceMapId ?? undefined,
      evidenceMapItemId: args.evidenceMapItemId ?? undefined,
      taskId: args.taskId ?? undefined,
      priority: args.priority ?? 'MEDIUM',
      createdBy: args.createdBy
    }
  });
}

export async function resolveTrustFindingsForQuestionnaireItem(args: {
  tenantId: string;
  questionnaireItemId: string;
  sourceType?: 'TRUSTOPS_EVIDENCE_GAP' | 'TRUSTOPS_REJECTION';
}) {
  return prisma.finding.updateMany({
    where: {
      tenantId: args.tenantId,
      questionnaireItemId: args.questionnaireItemId,
      sourceType: args.sourceType ? args.sourceType : { in: ['TRUSTOPS_EVIDENCE_GAP', 'TRUSTOPS_REJECTION'] },
      status: { in: ['OPEN', 'IN_PROGRESS'] }
    },
    data: {
      status: 'RESOLVED'
    }
  });
}
