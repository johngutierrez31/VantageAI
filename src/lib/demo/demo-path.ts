type DemoRouteRecord = {
  label: string;
  href: string;
  note: string;
  status?: string | null;
};

type DemoPathRecords = {
  trustInbox:
    | {
        id: string;
        title: string;
        status: string;
      }
    | null;
  questionnaire:
    | {
        id: string;
        filename: string;
        organizationName: string | null;
        status: string;
      }
    | null;
  evidenceMap:
    | {
        id: string;
        name: string;
        status: string;
      }
    | null;
  boardBrief:
    | {
        id: string;
        title: string;
        status: string;
      }
    | null;
  quarterlyReview:
    | {
        id: string;
        reviewPeriod: string;
        status: string;
      }
    | null;
  aiUseCase:
    | {
        id: string;
        name: string;
        status: string;
      }
    | null;
  aiVendorReview:
    | {
        id: string;
        vendorName: string;
        productName: string;
        status: string;
      }
    | null;
  activeIncident:
    | {
        id: string;
        title: string;
        status: string;
      }
    | null;
  afterActionIncident:
    | {
        id: string;
        title: string;
        status: string;
        reportStatus: string;
      }
    | null;
  tabletop:
    | {
        id: string;
        title: string;
        status: string;
      }
    | null;
};

export type DemoPathViewModel = {
  title: string;
  subtitle: string;
  threeMinutePath: DemoRouteRecord[];
  tenMinutePath: DemoRouteRecord[];
  artifacts: DemoRouteRecord[];
};

function trustInboxRecord(records: DemoPathRecords): DemoRouteRecord {
  if (records.trustInbox) {
    return {
      label: records.trustInbox.title,
      href: `/app/trust/inbox/${records.trustInbox.id}`,
      note: 'Show the intake, linked questionnaire, evidence map, and packet history in one trust workflow.',
      status: records.trustInbox.status
    };
  }

  return {
    label: 'Open TrustOps',
    href: '/app/trust',
    note: 'Start from the TrustOps workspace when the seeded diligence package is unavailable.'
  };
}

function questionnaireRecord(records: DemoPathRecords): DemoRouteRecord {
  if (records.questionnaire) {
    return {
      label: records.questionnaire.organizationName
        ? `${records.questionnaire.organizationName} questionnaire`
        : records.questionnaire.filename,
      href: `/app/questionnaires/${records.questionnaire.id}`,
      note: 'Open the row-level drafting and review workflow with approved answers and one visible review-gated gap.',
      status: records.questionnaire.status
    };
  }

  return {
    label: 'Open Questionnaires',
    href: '/app/questionnaires',
    note: 'Use the questionnaire list if a seeded detail record is unavailable.'
  };
}

function evidenceMapRecord(records: DemoPathRecords): DemoRouteRecord {
  if (records.evidenceMap) {
    return {
      label: records.evidenceMap.name,
      href: `/app/trust/evidence-maps/${records.evidenceMap.id}`,
      note: 'Show support strength, open gaps, and packet-ready evidence clustering.',
      status: records.evidenceMap.status
    };
  }

  return {
    label: 'Open Evidence Maps',
    href: '/app/trust',
    note: 'Use the TrustOps workspace if a seeded evidence map is unavailable.'
  };
}

function boardBriefRecord(records: DemoPathRecords): DemoRouteRecord {
  if (records.boardBrief) {
    return {
      label: records.boardBrief.title,
      href: `/app/pulse/board-briefs/${records.boardBrief.id}`,
      note: 'Translate the cross-module story into one executive artifact with decisions and overdue actions.',
      status: records.boardBrief.status
    };
  }

  return {
    label: 'Open Pulse',
    href: '/app/pulse',
    note: 'Use the Pulse dashboard if a seeded board brief is unavailable.'
  };
}

function quarterlyReviewRecord(records: DemoPathRecords): DemoRouteRecord {
  if (records.quarterlyReview) {
    return {
      label: `Quarterly review ${records.quarterlyReview.reviewPeriod}`,
      href: `/app/pulse/quarterly-reviews/${records.quarterlyReview.id}`,
      note: 'Show the leadership review record that turns posture into follow-up decisions.',
      status: records.quarterlyReview.status
    };
  }

  return {
    label: 'Open Quarterly Review',
    href: '/app/pulse',
    note: 'Use the Pulse dashboard when a finalized review record is unavailable.'
  };
}

function aiUseCaseRecord(records: DemoPathRecords): DemoRouteRecord {
  if (records.aiUseCase) {
    return {
      label: records.aiUseCase.name,
      href: `/app/ai-governance/use-cases/${records.aiUseCase.id}`,
      note: 'Show the conditional approval path, policy mapping, and Pulse-linked AI risk.',
      status: records.aiUseCase.status
    };
  }

  return {
    label: 'Open AI Governance',
    href: '/app/ai-governance',
    note: 'Use the AI Governance dashboard if a seeded use-case record is unavailable.'
  };
}

function aiVendorReviewRecord(records: DemoPathRecords): DemoRouteRecord {
  if (records.aiVendorReview) {
    return {
      label: `${records.aiVendorReview.vendorName} vendor intake`,
      href: `/app/ai-governance/vendors/${records.aiVendorReview.id}`,
      note: `Open the vendor review for ${records.aiVendorReview.productName} and show approval conditions.`,
      status: records.aiVendorReview.status
    };
  }

  return {
    label: 'Open AI Vendor Intake',
    href: '/app/ai-governance/vendors',
    note: 'Use the vendor queue if a seeded intake record is unavailable.'
  };
}

function activeIncidentRecord(records: DemoPathRecords): DemoRouteRecord {
  if (records.activeIncident) {
    return {
      label: records.activeIncident.title,
      href: `/app/response-ops/incidents/${records.activeIncident.id}`,
      note: 'Show the live incident, runbook pack, timeline, and linked trust or AI carry-over.',
      status: records.activeIncident.status
    };
  }

  return {
    label: 'Open Response Ops',
    href: '/app/response-ops',
    note: 'Use the Response Ops dashboard if a seeded active incident is unavailable.'
  };
}

function afterActionRecord(records: DemoPathRecords): DemoRouteRecord {
  if (records.afterActionIncident) {
    return {
      label: records.afterActionIncident.title,
      href: `/app/response-ops/incidents/${records.afterActionIncident.id}`,
      note: 'Use the resolved incident to show the approved after-action report and follow-up work.',
      status: records.afterActionIncident.reportStatus
    };
  }

  return {
    label: 'Open After-Action Workflow',
    href: '/app/response-ops',
    note: 'Use the Response Ops dashboard if a seeded after-action report is unavailable.'
  };
}

function tabletopRecord(records: DemoPathRecords): DemoRouteRecord {
  if (records.tabletop) {
    return {
      label: records.tabletop.title,
      href: `/app/response-ops/tabletops/${records.tabletop.id}`,
      note: 'Show the next tabletop and how readiness work becomes tasks, findings, and Pulse carry-over.',
      status: records.tabletop.status
    };
  }

  return {
    label: 'Open Tabletops',
    href: '/app/response-ops',
    note: 'Use the Response Ops dashboard if a seeded tabletop is unavailable.'
  };
}

export function buildDemoPathViewModel(records: DemoPathRecords): DemoPathViewModel {
  const trustInbox = trustInboxRecord(records);
  const questionnaire = questionnaireRecord(records);
  const evidenceMap = evidenceMapRecord(records);
  const boardBrief = boardBriefRecord(records);
  const quarterlyReview = quarterlyReviewRecord(records);
  const aiUseCase = aiUseCaseRecord(records);
  const aiVendorReview = aiVendorReviewRecord(records);
  const activeIncident = activeIncidentRecord(records);
  const afterAction = afterActionRecord(records);
  const tabletop = tabletopRecord(records);

  return {
    title: 'Start Here: Demo Path',
    subtitle:
      'Lead with the shortest proof of value: buyer diligence to board visibility to governed AI to a live incident, all from one seeded workspace.',
    threeMinutePath: [
      {
        label: 'Command Center',
        href: '/app/command-center',
        note: 'Frame the story in one screen: TrustOps pressure, Pulse posture, AI decisions, and live response work.'
      },
      trustInbox,
      boardBrief,
      aiUseCase,
      activeIncident
    ],
    tenMinutePath: [
      {
        label: 'Command Center',
        href: '/app/command-center',
        note: 'Start with the operating-system view.'
      },
      trustInbox,
      questionnaire,
      evidenceMap,
      boardBrief,
      quarterlyReview,
      aiUseCase,
      aiVendorReview,
      activeIncident,
      afterAction,
      tabletop
    ],
    artifacts: [trustInbox, boardBrief, aiUseCase, activeIncident, afterAction]
  };
}

export async function getTenantDemoPathViewModel(tenantId: string): Promise<DemoPathViewModel> {
  const { prisma } = await import('@/lib/db/prisma');
  const [trustInbox, questionnaire, evidenceMap, boardBrief, quarterlyReview, aiUseCase, aiVendorReview, activeIncident, afterActionIncident, tabletop] =
    await Promise.all([
      prisma.trustInboxItem.findFirst({
        where: { tenantId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, title: true, status: true }
      }),
      prisma.questionnaireUpload.findFirst({
        where: { tenantId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, filename: true, organizationName: true, status: true }
      }),
      prisma.evidenceMap.findFirst({
        where: { tenantId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, name: true, status: true }
      }),
      prisma.boardBrief.findFirst({
        where: { tenantId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, title: true, status: true }
      }),
      prisma.quarterlyReview.findFirst({
        where: { tenantId },
        orderBy: [{ reviewDate: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, reviewPeriod: true, status: true }
      }),
      prisma.aIUseCase.findFirst({
        where: { tenantId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, name: true, status: true }
      }),
      prisma.aIVendorReview.findFirst({
        where: { tenantId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, vendorName: true, productName: true, status: true }
      }),
      prisma.incident.findFirst({
        where: {
          tenantId,
          status: {
            in: ['NEW', 'TRIAGE', 'ACTIVE', 'CONTAINED', 'RECOVERING']
          }
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, title: true, status: true }
      }),
      prisma.incident.findFirst({
        where: {
          tenantId,
          afterActionReports: { some: {} }
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          status: true,
          afterActionReports: {
            orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
            take: 1,
            select: { status: true }
          }
        }
      }),
      prisma.tabletopExercise.findFirst({
        where: { tenantId },
        orderBy: [{ exerciseDate: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, title: true, status: true }
      })
    ]);

  return buildDemoPathViewModel({
    trustInbox,
    questionnaire,
    evidenceMap,
    boardBrief,
    quarterlyReview,
    aiUseCase,
    aiVendorReview,
    activeIncident,
    afterActionIncident: afterActionIncident
      ? {
          id: afterActionIncident.id,
          title: afterActionIncident.title,
          status: afterActionIncident.status,
          reportStatus: afterActionIncident.afterActionReports[0]?.status ?? null
        }
      : null,
    tabletop
  });
}
