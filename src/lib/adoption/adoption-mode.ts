import { prisma } from '@/lib/db/prisma';

export const ADOPTION_START_PATHS = [
  {
    id: 'questionnaire',
    title: 'I need to answer a questionnaire',
    description: 'Bring in existing approved answers, open the current questionnaire, and move toward a buyer-ready packet.',
    href: '/app/trust',
    outcome: 'Approved answers, evidence support, and a buyer-safe deliverable'
  },
  {
    id: 'board-brief',
    title: 'I need a board brief',
    description: 'Use Pulse as the executive layer on top of current findings, risks, overdue work, and trust pressure.',
    href: '/app/pulse',
    outcome: 'A scorecard, roadmap, and board-ready narrative'
  },
  {
    id: 'ai-governance',
    title: 'I need to review AI use',
    description: 'Register AI use cases and vendor reviews, then carry decisions into findings and Pulse risk.',
    href: '/app/ai-governance',
    outcome: 'Governed AI approvals with visible carry-over'
  },
  {
    id: 'incident',
    title: 'I need to manage an incident',
    description: 'Track incidents, after-action follow-up, and downstream risk without replacing the rest of your response stack.',
    href: '/app/response-ops',
    outcome: 'A durable incident record with carry-over into Pulse'
  },
  {
    id: 'overlay',
    title: 'I already have tools, show me how Vantage fits in',
    description: 'Use connectors, imports, and cross-module carry-over to run Vantage as the operating layer above your existing stack.',
    href: '/app/adoption',
    outcome: 'A practical adoption plan without rip-and-replace pressure'
  }
] as const;

export async function getTenantAdoptionModeViewModel(tenantId: string) {
  const [
    connectorCount,
    importCount,
    approvedAnswerCount,
    openFindingCount,
    openRiskCount,
    incidentCount,
    latestImport,
    latestQuestionnaire,
    latestEvidenceMap,
    latestRisk,
    latestRoadmapItem,
    latestBoardBrief,
    latestIncident
  ] = await Promise.all([
    prisma.connectorConfig.count({ where: { tenantId } }),
    prisma.adoptionImport.count({ where: { tenantId } }),
    prisma.approvedAnswer.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.finding.count({ where: { tenantId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.riskRegisterItem.count({
      where: { tenantId, status: { in: ['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED'] } }
    }),
    prisma.incident.count({
      where: { tenantId, status: { in: ['NEW', 'TRIAGE', 'ACTIVE', 'CONTAINED', 'RECOVERING', 'POST_INCIDENT_REVIEW'] } }
    }),
    prisma.adoptionImport.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        connector: {
          select: {
            name: true,
            provider: true
          }
        }
      }
    }),
    prisma.questionnaireUpload.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        filename: true,
        organizationName: true,
        status: true
      }
    }),
    prisma.evidenceMap.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true
      }
    }),
    prisma.riskRegisterItem.findFirst({
      where: { tenantId },
      orderBy: [{ severity: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        status: true,
        severity: true
      }
    }),
    prisma.roadmapItem.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true
      }
    }),
    prisma.boardBrief.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true
      }
    }),
    prisma.incident.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true
      }
    })
  ]);

  return {
    metrics: {
      connectorCount,
      importCount,
      approvedAnswerCount,
      openFindingCount,
      openRiskCount,
      incidentCount
    },
    latestImport: latestImport
      ? {
          id: latestImport.id,
          target: latestImport.target,
          source: latestImport.source,
          status: latestImport.status,
          createdCount: latestImport.createdCount,
          failedCount: latestImport.failedCount,
          summary: latestImport.summary,
          sourceLabel: latestImport.sourceLabel,
          connectorName: latestImport.connector?.name ?? null,
          connectorProvider: latestImport.connector?.provider ?? null,
          createdAt: latestImport.createdAt.toISOString()
        }
      : null,
    valueGraph: [
      latestQuestionnaire
        ? {
            id: 'questionnaire',
            label: latestQuestionnaire.organizationName ?? latestQuestionnaire.filename,
            helper: `TrustOps intake in ${latestQuestionnaire.status.toLowerCase()} status`,
            href: `/app/questionnaires/${latestQuestionnaire.id}`
          }
        : {
            id: 'questionnaire',
            label: 'Questionnaire intake',
            helper: 'Use TrustOps to anchor buyer diligence work',
            href: '/app/questionnaires'
          },
      latestEvidenceMap
        ? {
            id: 'evidence-map',
            label: latestEvidenceMap.name,
            helper: `Evidence support in ${latestEvidenceMap.status.toLowerCase()} status`,
            href: `/app/trust/evidence-maps/${latestEvidenceMap.id}`
          }
        : {
            id: 'evidence-map',
            label: 'Evidence map',
            helper: 'Collapse duplicate buyer questions into reusable support',
            href: '/app/trust'
          },
      latestRisk
        ? {
            id: 'risk',
            label: latestRisk.title,
            helper: `${latestRisk.severity.toLowerCase()} risk in ${latestRisk.status.toLowerCase()} status`,
            href: '/app/pulse/risks'
          }
        : {
            id: 'risk',
            label: 'Finding or risk carry-over',
            helper: 'Push weak support into owned follow-up work',
            href: '/app/findings'
          },
      latestRoadmapItem
        ? {
            id: 'roadmap',
            label: latestRoadmapItem.title,
            helper: `Roadmap item in ${latestRoadmapItem.status.toLowerCase()} status`,
            href: '/app/pulse/roadmap'
          }
        : {
            id: 'roadmap',
            label: 'Roadmap carry-over',
            helper: 'Translate today’s pressure into a 30/60/90 plan',
            href: '/app/pulse/roadmap'
          },
      latestBoardBrief
        ? {
            id: 'board-brief',
            label: latestBoardBrief.title,
            helper: `Board brief in ${latestBoardBrief.status.toLowerCase()} status`,
            href: `/app/pulse/board-briefs/${latestBoardBrief.id}`
          }
        : {
            id: 'board-brief',
            label: 'Board brief',
            helper: 'Turn operational pressure into leadership-ready narrative',
            href: '/app/pulse'
          },
      latestIncident
        ? {
            id: 'incident',
            label: latestIncident.title,
            helper: `Response Ops incident in ${latestIncident.status.toLowerCase()} status`,
            href: `/app/response-ops/incidents/${latestIncident.id}`
          }
        : {
            id: 'incident',
            label: 'Incident carry-over',
            helper: 'Keep incident lessons and follow-up visible across the suite',
            href: '/app/response-ops'
          }
    ]
  };
}
