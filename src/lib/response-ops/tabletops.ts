import { prisma } from '@/lib/db/prisma';
import { syncTabletopConsequences } from '@/lib/response-ops/consequences';

type TabletopStatus = 'DRAFT' | 'COMPLETED' | 'ARCHIVED';
type ScenarioType =
  | 'IDENTITY_COMPROMISE'
  | 'RANSOMWARE'
  | 'PHISHING'
  | 'THIRD_PARTY_BREACH'
  | 'CLOUD_EXPOSURE'
  | 'LOST_DEVICE'
  | 'AI_MISUSE'
  | 'OTHER';

type TabletopTemplate = {
  title: string;
  scenarioSummary: string;
  exerciseObjectives: string[];
  expectedDecisions: string[];
  likelyGapAreas: string[];
};

const tabletopTemplates: Record<ScenarioType, TabletopTemplate> = {
  IDENTITY_COMPROMISE: {
    title: 'Identity compromise tabletop',
    scenarioSummary: 'Walk the first hour of an admin or privileged-user takeover and test access, communications, and decision speed.',
    exerciseObjectives: [
      'Validate account containment authority and privileged-access shutdown steps.',
      'Confirm evidence collection and authentication-log access.',
      'Test leadership update timing and ownership.'
    ],
    expectedDecisions: [
      'When to revoke broader sessions or reset admin credentials.',
      'When the incident should be escalated to executive visibility.',
      'What evidence threshold is required before customer notice is discussed.'
    ],
    likelyGapAreas: ['Break-glass access', 'MFA reset path', 'Communications ownership']
  },
  RANSOMWARE: {
    title: 'Ransomware tabletop',
    scenarioSummary: 'Walk a fast-moving ransomware and extortion scenario through containment, recovery sequencing, and leadership decisions.',
    exerciseObjectives: [
      'Validate isolation authority and backup confidence.',
      'Test communications, legal escalation, and restoration sequencing.',
      'Capture ownership for business-priority recovery.'
    ],
    expectedDecisions: [
      'When to isolate business-critical systems despite short-term outage impact.',
      'How recovery order is set across impacted services.',
      'Who approves external communications and legal posture.'
    ],
    likelyGapAreas: ['Backup confidence', 'Business recovery ownership', 'Legal escalation timing']
  },
  PHISHING: {
    title: 'Phishing tabletop',
    scenarioSummary: 'Walk mailbox compromise, user reporting, and escalation decisions for phishing that may turn into identity or endpoint compromise.',
    exerciseObjectives: [
      'Validate mailbox triage and scoping speed.',
      'Confirm when phishing becomes an incident rather than a helpdesk issue.',
      'Test user communications and evidence preservation.'
    ],
    expectedDecisions: [
      'When to force resets or isolate affected devices.',
      'Who owns broader user notification.',
      'What data confirms payload execution or credential entry.'
    ],
    likelyGapAreas: ['Mailbox triage ownership', 'User comms', 'Endpoint evidence']
  },
  THIRD_PARTY_BREACH: {
    title: 'Third-party breach tabletop',
    scenarioSummary: 'Walk a vendor breach scenario from dependency scoping through trust communications and containment of shared credentials.',
    exerciseObjectives: [
      'Validate vendor inventory and dependency scoping.',
      'Confirm shared-secret rotation and compensating controls.',
      'Test trust-facing communication ownership.'
    ],
    expectedDecisions: [
      'When to restrict vendor integrations.',
      'What customer-facing explanation is approved.',
      'What contract or DPA facts must be confirmed first.'
    ],
    likelyGapAreas: ['Vendor inventory', 'Secret rotation', 'Trust communications']
  },
  CLOUD_EXPOSURE: {
    title: 'Cloud exposure tabletop',
    scenarioSummary: 'Walk cloud misconfiguration or exposed-data response decisions across infrastructure, identity, and customer impact.',
    exerciseObjectives: [
      'Validate scoping for affected cloud assets and data classes.',
      'Confirm containment and recovery decision paths.',
      'Test infrastructure and leadership coordination.'
    ],
    expectedDecisions: [
      'When to shut down public access immediately versus staged containment.',
      'What data exposure threshold changes leadership posture.',
      'Which guardrails become mandatory follow-up.'
    ],
    likelyGapAreas: ['Cloud inventory', 'Data classification', 'Guardrail enforcement']
  },
  LOST_DEVICE: {
    title: 'Lost device tabletop',
    scenarioSummary: 'Walk lost-device and credential-exposure response across device management, account containment, and internal communications.',
    exerciseObjectives: [
      'Validate device lock or wipe authority.',
      'Confirm account containment and access review.',
      'Test reporting speed and stakeholder coordination.'
    ],
    expectedDecisions: [
      'When to wipe or retire the device.',
      'What account actions are required immediately.',
      'Which stakeholders need notice.'
    ],
    likelyGapAreas: ['MDM authority', 'Credential containment', 'Reporting speed']
  },
  AI_MISUSE: {
    title: 'AI misuse tabletop',
    scenarioSummary: 'Walk unsafe AI output, data leakage, or unapproved model use across governance, legal, and technical response.',
    exerciseObjectives: [
      'Validate shutdown authority for unsafe AI workflows.',
      'Confirm how AI governance joins incident response.',
      'Capture data-class and vendor exposure decisions.'
    ],
    expectedDecisions: [
      'When to disable the AI workflow immediately.',
      'What governance or legal review is mandatory before restart.',
      'What data-class exposure triggers broader escalation.'
    ],
    likelyGapAreas: ['AI governance coordination', 'Prompt/output evidence', 'Vendor handling']
  },
  OTHER: {
    title: 'Custom incident tabletop',
    scenarioSummary: 'Run a practical exercise for a custom scenario with decision points, notes, and follow-up capture.',
    exerciseObjectives: [
      'Confirm first-hour ownership and communication path.',
      'Test evidence collection and containment decision speed.',
      'Capture concrete follow-up actions.'
    ],
    expectedDecisions: [
      'What facts are required before escalation.',
      'What immediate action is safest in the first hour.',
      'Who owns the next leadership update.'
    ],
    likelyGapAreas: ['Ownership', 'Evidence capture', 'Decision speed']
  }
};

function scenarioTemplate(scenarioType: ScenarioType) {
  return tabletopTemplates[scenarioType];
}

export async function createTabletopExercise(args: {
  tenantId: string;
  userId: string;
  input: {
    title?: string;
    scenarioType: ScenarioType;
    exerciseDate?: Date;
    participantNames?: string[];
    participantRoles?: string[];
    exerciseNotes?: string | null;
  };
}) {
  const template = scenarioTemplate(args.input.scenarioType);

  return prisma.tabletopExercise.create({
    data: {
      tenantId: args.tenantId,
      title: args.input.title?.trim() || template.title,
      scenarioType: args.input.scenarioType,
      exerciseDate: args.input.exerciseDate ?? new Date(),
      participantNames: args.input.participantNames ?? [],
      participantRoles: args.input.participantRoles ?? [],
      scenarioSummary: template.scenarioSummary,
      exerciseObjectives: template.exerciseObjectives,
      expectedDecisions: template.expectedDecisions,
      exerciseNotes: args.input.exerciseNotes ?? null,
      gapsIdentified: template.likelyGapAreas,
      followUpActions: template.likelyGapAreas.map((gap) => `Close tabletop gap: ${gap}`),
      createdBy: args.userId
    }
  });
}

export async function updateTabletopExercise(args: {
  tenantId: string;
  tabletopId: string;
  actorUserId: string;
  input: {
    title?: string;
    status?: TabletopStatus;
    exerciseDate?: Date;
    participantNames?: string[];
    participantRoles?: string[];
    exerciseNotes?: string | null;
    decisionsMade?: string[];
    gapsIdentified?: string[];
    followUpActions?: string[];
    reviewerNotes?: string | null;
  };
}) {
  const existing = await prisma.tabletopExercise.findFirstOrThrow({
    where: {
      tenantId: args.tenantId,
      id: args.tabletopId
    }
  });

  const tabletop = await prisma.tabletopExercise.update({
    where: { id: existing.id },
    data: {
      title: args.input.title,
      status: args.input.status,
      exerciseDate: args.input.exerciseDate,
      participantNames: args.input.participantNames,
      participantRoles: args.input.participantRoles,
      exerciseNotes: args.input.exerciseNotes,
      decisionsMade: args.input.decisionsMade,
      gapsIdentified: args.input.gapsIdentified,
      followUpActions: args.input.followUpActions,
      reviewerNotes: args.input.reviewerNotes,
      completedBy: args.input.status === 'COMPLETED' ? args.actorUserId : args.input.status ? null : undefined,
      completedAt: args.input.status === 'COMPLETED' ? new Date() : args.input.status ? null : undefined
    }
  });

  if (tabletop.status === 'COMPLETED') {
    await syncTabletopConsequences(tabletop);
  }

  return prisma.tabletopExercise.findUniqueOrThrow({
    where: { id: tabletop.id }
  });
}
