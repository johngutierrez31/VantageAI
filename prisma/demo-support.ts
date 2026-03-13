import {
  IngestionStatus,
  MembershipStatus,
  PrismaClient,
  TemplateStatus,
  TenantRole
} from '@prisma/client';

export const DEMO_TENANT_ID = 'tenant_demo';
export const DEMO_TENANT_SLUG = 'demo-tenant';
export const DEMO_TENANT_NAME = 'Demo Tenant';
export const DEMO_USER_ID = 'user_demo_admin';
export const DEMO_USER_EMAIL = 'admin@vantageciso.local';
export const DEMO_USER_NAME = 'Demo Admin';
export const DEMO_EMAIL_VERIFIED_AT = new Date('2026-01-01T00:00:00.000Z');
export const DEMO_REPORTING_PERIOD = '2026 Q1';

export const DEMO_USERS = [
  {
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    name: DEMO_USER_NAME,
    role: TenantRole.OWNER
  },
  {
    id: 'user_demo_trust_reviewer',
    email: 'trust.reviewer@vantageciso.local',
    name: 'Morgan Trust',
    role: TenantRole.ADMIN
  },
  {
    id: 'user_demo_ops_lead',
    email: 'ops.lead@vantageciso.local',
    name: 'Taylor Ops',
    role: TenantRole.MEMBER
  }
] as const;

export const DEMO_IDS = {
  assessment: 'assessment_demo_q1',
  assessmentReport: 'assessment_report_demo_q1',
  evidencePolicy: 'evidence_demo_policy_pack',
  evidenceAccess: 'evidence_demo_access_review',
  evidenceAi: 'evidence_demo_ai_standard',
  evidenceIr: 'evidence_demo_ir_matrix',
  questionnaireUpload: 'questionnaire_demo_northbridge',
  questionnaireItemPolicies: 'questionnaire_item_demo_policies',
  questionnaireItemMfa: 'questionnaire_item_demo_mfa',
  questionnaireItemAi: 'questionnaire_item_demo_ai',
  questionnaireItemResidency: 'questionnaire_item_demo_residency',
  draftPolicies: 'draft_answer_demo_policies',
  draftMfa: 'draft_answer_demo_mfa',
  draftAi: 'draft_answer_demo_ai',
  draftResidency: 'draft_answer_demo_residency',
  approvedPolicies: 'approved_answer_demo_policies',
  approvedMfa: 'approved_answer_demo_mfa',
  approvedAi: 'approved_answer_demo_ai',
  trustInbox: 'trust_inbox_demo_northbridge',
  trustPacket: 'trust_packet_demo_northbridge',
  trustRoom: 'trust_room_demo_northbridge',
  trustRoomRequestApproved: 'trust_room_request_demo_approved',
  trustRoomRequestPending: 'trust_room_request_demo_pending',
  evidenceMap: 'evidence_map_demo_northbridge',
  evidenceMapPolicies: 'evidence_map_item_demo_policies',
  evidenceMapMfa: 'evidence_map_item_demo_mfa',
  evidenceMapAi: 'evidence_map_item_demo_ai',
  evidenceMapResidency: 'evidence_map_item_demo_residency',
  trustTask: 'task_demo_trust_residency_followup',
  trustFinding: 'finding_demo_trust_residency_gap',
  aiVendorReview: 'ai_vendor_review_demo_answerflow',
  aiUseCase: 'ai_use_case_demo_questionnaire_copilot',
  aiTask: 'task_demo_ai_retention_followup',
  aiFinding: 'finding_demo_ai_governance_gap',
  activeIncident: 'incident_demo_answerflow_notice',
  activeIncidentPack: 'incident_pack_demo_answerflow',
  activeIncidentTaskTriage: 'task_demo_incident_vendor_triage',
  activeIncidentTaskContainment: 'task_demo_incident_vendor_containment',
  activeIncidentTaskCommunications: 'task_demo_incident_vendor_communications',
  activeIncidentFinding: 'finding_demo_incident_vendor_exposure',
  resolvedIncident: 'incident_demo_privileged_mailbox',
  postIncidentTask: 'task_demo_post_incident_playbook',
  afterAction: 'after_action_demo_privileged_mailbox',
  afterActionFinding: 'finding_demo_after_action_gap',
  tabletop: 'tabletop_demo_ransomware_q2',
  tabletopTask: 'task_demo_tabletop_followup',
  riskTrust: 'risk_demo_trust_residency',
  riskAi: 'risk_demo_ai_vendor',
  riskIncident: 'risk_demo_incident_vendor',
  pulseSnapshot: 'pulse_snapshot_demo_2026_q1',
  pulseCategoryAssessment: 'pulse_category_demo_assessment',
  pulseCategoryFindings: 'pulse_category_demo_findings',
  pulseCategoryRemediation: 'pulse_category_demo_remediation',
  pulseCategoryTrust: 'pulse_category_demo_trust',
  pulseCategoryReadiness: 'pulse_category_demo_readiness',
  roadmap: 'pulse_roadmap_demo_2026_q1',
  roadmap30: 'roadmap_item_demo_30',
  roadmap60: 'roadmap_item_demo_60',
  roadmap90: 'roadmap_item_demo_90',
  boardBrief: 'board_brief_demo_2026_q1',
  quarterlyReview: 'quarterly_review_demo_2026_q1',
  connectorSlack: 'connector_demo_slack',
  connectorJira: 'connector_demo_jira',
  connectorConfluence: 'connector_demo_confluence',
  connectorWebhook: 'connector_demo_webhook',
  adoptionImportAnswers: 'adoption_import_demo_answers',
  adoptionImportRisk: 'adoption_import_demo_risk'
} as const;

type SeedTemplate = {
  name: string;
  description: string;
  domains: Array<{
    domain: string;
    code: string;
    title: string;
    questions: string[];
  }>;
};

const seedTemplates: SeedTemplate[] = [
  {
    name: 'Security Readiness (V1)',
    description: 'Baseline security readiness template inspired by SOC 2-style categories.',
    domains: [
      {
        domain: 'Governance',
        code: 'SEC-GOV-1',
        title: 'Security policy governance',
        questions: [
          'Do you maintain approved security policies?',
          'Are policy owners assigned and reviewed quarterly?'
        ]
      },
      {
        domain: 'Access',
        code: 'SEC-ACC-1',
        title: 'Identity and access controls',
        questions: [
          'Is MFA enforced for privileged accounts?',
          'Are access reviews performed at least quarterly?'
        ]
      }
    ]
  },
  {
    name: 'AI Readiness (V1)',
    description: 'AI readiness template drawing from NIST AI RMF and ISO 42001 concepts.',
    domains: [
      {
        domain: 'Govern',
        code: 'AI-GOV-1',
        title: 'AI governance and ownership',
        questions: [
          'Is there an AI risk committee?',
          'Are AI use-cases classified by impact tier?'
        ]
      },
      {
        domain: 'Secure Build',
        code: 'AI-SEC-1',
        title: 'LLM security and abuse controls',
        questions: [
          'Do prompts and outputs undergo safety filtering?',
          'Are model and data lineage records retained?'
        ]
      }
    ]
  }
];

export function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

export function addHours(date: Date, hours: number) {
  const value = new Date(date);
  value.setUTCHours(value.getUTCHours() + hours);
  return value;
}

export function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}

export async function resetTenantScopedData(prisma: PrismaClient, tenantId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.verificationToken.deleteMany({
      where: {
        identifier: {
          in: DEMO_USERS.map((user) => user.email)
        }
      }
    });

    await tx.quarterlyReview.deleteMany({ where: { tenantId } });
    await tx.boardBrief.deleteMany({ where: { tenantId } });
    await tx.roadmapItem.deleteMany({ where: { tenantId } });
    await tx.pulseRoadmap.deleteMany({ where: { tenantId } });
    await tx.riskRegisterItem.deleteMany({ where: { tenantId } });
    await tx.pulseCategoryScore.deleteMany({ where: { tenantId } });
    await tx.pulseSnapshot.deleteMany({ where: { tenantId } });
    await tx.afterActionReport.deleteMany({ where: { tenantId } });
    await tx.incidentTimelineEvent.deleteMany({ where: { tenantId } });
    await tx.incidentRunbookPack.deleteMany({ where: { tenantId } });
    await tx.tabletopExercise.deleteMany({ where: { tenantId } });
    await tx.finding.deleteMany({ where: { tenantId } });
    await tx.task.deleteMany({ where: { tenantId } });
    await tx.incident.deleteMany({ where: { tenantId } });
    await tx.aIUseCase.deleteMany({ where: { tenantId } });
    await tx.aIVendorReview.deleteMany({ where: { tenantId } });
    await tx.reportExport.deleteMany({ where: { tenantId } });
    await tx.report.deleteMany({ where: { tenantId } });
    await tx.connectorActivity.deleteMany({ where: { tenantId } });
    await tx.connectorObjectLink.deleteMany({ where: { tenantId } });
    await tx.connectorConfig.deleteMany({ where: { tenantId } });
    await tx.adoptionImport.deleteMany({ where: { tenantId } });
    await tx.trustRoomEngagementEvent.deleteMany({ where: { tenantId } });
    await tx.trustRoomAccessRequest.deleteMany({ where: { tenantId } });
    await tx.trustRoom.deleteMany({ where: { tenantId } });
    await tx.trustPacket.deleteMany({ where: { tenantId } });
    await tx.evidenceMapItem.deleteMany({ where: { tenantId } });
    await tx.evidenceMap.deleteMany({ where: { tenantId } });
    await tx.trustInboxAttachment.deleteMany({ where: { tenantId } });
    await tx.trustInboxItem.deleteMany({ where: { tenantId } });
    await tx.approvedAnswer.deleteMany({ where: { tenantId } });
    await tx.draftAnswer.deleteMany({ where: { tenantId } });
    await tx.questionnaireMapping.deleteMany({ where: { tenantId } });
    await tx.questionnaireItem.deleteMany({ where: { tenantId } });
    await tx.questionnaireUpload.deleteMany({ where: { tenantId } });
    await tx.questionnaireImportRow.deleteMany({ where: { tenantId } });
    await tx.questionnaireImport.deleteMany({ where: { tenantId } });
    await tx.evidenceLink.deleteMany({ where: { tenantId } });
    await tx.trustDoc.deleteMany({ where: { tenantId } });
    await tx.evidenceChunk.deleteMany({ where: { tenantId } });
    await tx.evidenceRequest.deleteMany({ where: { tenantId } });
    await tx.exception.deleteMany({ where: { tenantId } });
    await tx.response.deleteMany({ where: { tenantId } });
    await tx.assessment.deleteMany({ where: { tenantId } });
    await tx.aISuggestion.deleteMany({ where: { tenantId } });
    await tx.auditLog.deleteMany({ where: { tenantId } });
    await tx.billingWebhookEvent.deleteMany({ where: { tenantId } });
    await tx.stripeCustomer.deleteMany({ where: { tenantId } });
    await tx.subscription.deleteMany({ where: { tenantId } });
    await tx.evidence.deleteMany({ where: { tenantId } });
    await tx.template.deleteMany({ where: { tenantId } });
  });
}

export async function seedTemplatesForTenant(prisma: PrismaClient, tenantId: string, userId: string) {
  for (const templateDef of seedTemplates) {
    const template = await prisma.template.create({
      data: {
        tenantId,
        name: templateDef.name,
        description: templateDef.description,
        status: TemplateStatus.PUBLISHED,
        createdBy: userId
      }
    });

    const version = await prisma.templateVersion.create({
      data: {
        tenantId,
        templateId: template.id,
        version: 1,
        title: `${templateDef.name} - V1`,
        notes: 'Seeded template',
        isPublished: true
      }
    });

    await prisma.template.update({
      where: { id: template.id },
      data: { currentVersionId: version.id }
    });

    for (const controlDef of templateDef.domains) {
      const control = await prisma.control.create({
        data: {
          tenantId,
          templateVersionId: version.id,
          domain: controlDef.domain,
          code: controlDef.code,
          title: controlDef.title,
          weight: 1
        }
      });

      for (const prompt of controlDef.questions) {
        await prisma.question.create({
          data: {
            tenantId,
            controlId: control.id,
            prompt,
            rubric: '0=Not implemented, 1=Ad hoc, 2=Defined, 3=Managed, 4=Optimized',
            weight: 1
          }
        });
      }
    }
  }
}

export async function createEvidenceRecord(
  prisma: PrismaClient,
  args: {
    id: string;
    tenantId: string;
    createdBy: string;
    name: string;
    storageKey: string;
    mimeType: string;
    tags: string[];
    extractedText: string;
    trustCategory?: string;
    createdAt?: Date;
  }
) {
  const evidence = await prisma.evidence.create({
    data: {
      id: args.id,
      tenantId: args.tenantId,
      name: args.name,
      storageKey: args.storageKey,
      mimeType: args.mimeType,
      tags: args.tags,
      extractedText: args.extractedText,
      ingestionStatus: IngestionStatus.COMPLETED,
      extractedAt: args.createdAt ?? new Date(),
      createdBy: args.createdBy,
      createdAt: args.createdAt ?? new Date()
    }
  });

  const chunks = args.extractedText
    .split(/\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 3);

  for (const [index, chunk] of chunks.entries()) {
    await prisma.evidenceChunk.create({
      data: {
        tenantId: args.tenantId,
        evidenceId: evidence.id,
        chunkIndex: index,
        chunkText: chunk,
        tokenCount: chunk.split(/\s+/).length,
        embedding: [0, 0, 0],
        createdAt: args.createdAt ?? new Date()
      }
    });
  }

  if (args.trustCategory) {
    await prisma.trustDoc.create({
      data: {
        tenantId: args.tenantId,
        category: args.trustCategory,
        evidenceId: evidence.id,
        tagsJson: args.tags,
        createdBy: args.createdBy,
        createdAt: args.createdAt ?? new Date()
      }
    });
  }

  return evidence;
}

export async function ensureDemoUsers(prisma: PrismaClient, tenantId: string) {
  for (const demoUser of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        name: demoUser.name,
        emailVerified: DEMO_EMAIL_VERIFIED_AT
      },
      create: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        emailVerified: DEMO_EMAIL_VERIFIED_AT
      }
    });

    await prisma.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: demoUser.id
        }
      },
      update: {
        role: demoUser.role,
        status: MembershipStatus.ACTIVE
      },
      create: {
        tenantId,
        userId: demoUser.id,
        role: demoUser.role,
        status: MembershipStatus.ACTIVE
      }
    });
  }

  await prisma.account.deleteMany({
    where: {
      userId: {
        in: DEMO_USERS.map((user) => user.id)
      }
    }
  });

  await prisma.session.deleteMany({
    where: {
      userId: {
        in: DEMO_USERS.map((user) => user.id)
      }
    }
  });
}
