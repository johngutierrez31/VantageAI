import type { IncidentSeverity, IncidentType, ResponseOpsPhase, TaskPriority } from '@prisma/client';
import { getSecurityRunbookById } from '@/lib/intel/runbooks';

export type ResponseTaskTemplate = {
  title: string;
  details: string;
  priority: TaskPriority;
  phase: ResponseOpsPhase;
  dueOffsetHours: number;
};

export type IncidentScenarioTemplate = {
  incidentType: IncidentType;
  label: string;
  description: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultSeverity: IncidentSeverity;
  defaultExecutiveSummary: string;
  recommendedRunbookId: string | null;
  taskTemplates: ResponseTaskTemplate[];
  decisionLogPrompts: string[];
};

type ScenarioSummary = {
  incidentType: IncidentType;
  label: string;
  description: string;
  defaultSeverity: IncidentSeverity;
  recommendedRunbookId: string | null;
};

function task(
  title: string,
  details: string,
  priority: TaskPriority,
  phase: ResponseOpsPhase,
  dueOffsetHours: number
): ResponseTaskTemplate {
  return {
    title,
    details,
    priority,
    phase,
    dueOffsetHours
  };
}

const scenarioTemplates: Record<IncidentType, IncidentScenarioTemplate> = {
  IDENTITY_COMPROMISE: {
    incidentType: 'IDENTITY_COMPROMISE',
    label: 'Identity compromise',
    description: 'Contain likely account takeover, session abuse, or privileged access misuse.',
    defaultTitle: 'Identity compromise investigation',
    defaultDescription:
      'Investigate suspicious authentication activity, scope impacted accounts, and contain access before lateral movement expands.',
    defaultSeverity: 'HIGH',
    defaultExecutiveSummary:
      'Potential identity compromise requires rapid scoping, credential containment, evidence preservation, and owned communications.',
    recommendedRunbookId: 'identity-compromise',
    taskTemplates: [
      task(
        'Confirm the suspected identity compromise and initial blast radius',
        'Validate the user, tenant, admin roles, and currently affected apps or systems before wider action.',
        'CRITICAL',
        'TRIAGE',
        1
      ),
      task(
        'Collect identity provider, SSO, and MFA event evidence',
        'Preserve sign-in logs, token issuance events, MFA changes, device posture, and role-assignment changes.',
        'HIGH',
        'EVIDENCE_COLLECTION',
        2
      ),
      task(
        'Revoke active sessions and disable the impacted identity path',
        'Disable or suspend compromised users, revoke sessions, rotate admin credentials, and isolate break-glass access if needed.',
        'CRITICAL',
        'CONTAINMENT',
        1
      ),
      task(
        'Prepare the first leadership and legal update',
        'Summarize impact, known scope, containment action, and the next update time without overstating unconfirmed facts.',
        'HIGH',
        'COMMUNICATIONS',
        3
      ),
      task(
        'Schedule post-incident access hardening actions',
        'Capture lessons on MFA reset paths, privilege review, session controls, and identity detection coverage.',
        'HIGH',
        'POST_INCIDENT_REVIEW',
        48
      )
    ],
    decisionLogPrompts: [
      'What is the currently confirmed scope of compromised identities or admin privileges?',
      'What credential, token, or session actions were taken and when?',
      'Who owns executive, legal, and customer communications for the next update window?',
      'What additional containment threshold would trigger broader access revocation?'
    ]
  },
  RANSOMWARE: {
    incidentType: 'RANSOMWARE',
    label: 'Ransomware / extortion',
    description: 'Coordinate first-hour containment, evidence preservation, and recovery decisions.',
    defaultTitle: 'Ransomware or extortion response',
    defaultDescription:
      'Investigate suspected encryption, data staging, or extortion activity and execute business-priority containment.',
    defaultSeverity: 'CRITICAL',
    defaultExecutiveSummary:
      'Suspected ransomware or extortion requires immediate host isolation, evidence preservation, recovery sequencing, and executive communications.',
    recommendedRunbookId: 'ransomware-extortion',
    taskTemplates: [
      task(
        'Confirm affected systems and highest-priority business services',
        'Validate where encryption, staging, or exfiltration indicators are present and identify the critical recovery sequence.',
        'CRITICAL',
        'TRIAGE',
        1
      ),
      task(
        'Capture volatile evidence before destructive cleanup',
        'Preserve memory, security tooling output, extortion notes, and host telemetry for later investigation.',
        'HIGH',
        'EVIDENCE_COLLECTION',
        2
      ),
      task(
        'Isolate affected hosts, identities, and high-risk network paths',
        'Contain spread by isolating impacted assets and blocking known lateral movement or exfiltration paths.',
        'CRITICAL',
        'CONTAINMENT',
        1
      ),
      task(
        'Validate restoration readiness for business-critical services',
        'Confirm backup integrity, restoration order, dependency health, and recovery decision owners.',
        'HIGH',
        'RECOVERY',
        4
      ),
      task(
        'Prepare executive and customer communications posture',
        'Coordinate approved incident language, regulatory triggers, and customer-facing expectations.',
        'HIGH',
        'COMMUNICATIONS',
        3
      ),
      task(
        'Capture lessons learned for resilience, backup, and segmentation',
        'Create owned follow-up actions for backup validation, isolation speed, and containment authority.',
        'HIGH',
        'POST_INCIDENT_REVIEW',
        72
      )
    ],
    decisionLogPrompts: [
      'What business services are most time-sensitive for recovery sequencing?',
      'What containment actions are already irreversible and who approved them?',
      'What is the current position on extortion, negotiation, and legal escalation?',
      'When is the next executive update due and who owns it?'
    ]
  },
  PHISHING: {
    incidentType: 'PHISHING',
    label: 'Suspicious email / phishing',
    description: 'Triage phishing reports, determine scope, and escalate if compromise is confirmed.',
    defaultTitle: 'Phishing triage',
    defaultDescription:
      'Review suspicious email, confirm whether credentials or payload execution occurred, and contain affected accounts or devices.',
    defaultSeverity: 'MEDIUM',
    defaultExecutiveSummary:
      'Suspicious email activity requires rapid user, mailbox, and endpoint scoping before compromise expands.',
    recommendedRunbookId: 'identity-compromise',
    taskTemplates: [
      task(
        'Scope impacted inboxes, users, and possible payload execution',
        'Confirm recipients, malicious links, attachment interaction, and whether any downstream compromise occurred.',
        'HIGH',
        'TRIAGE',
        1
      ),
      task(
        'Preserve suspicious email headers, URLs, and endpoint artifacts',
        'Capture message headers, payload hashes, redirect chains, and relevant mailbox or endpoint telemetry.',
        'HIGH',
        'EVIDENCE_COLLECTION',
        2
      ),
      task(
        'Reset credentials or isolate affected devices when compromise is confirmed',
        'Move from phishing investigation to containment if the user executed code or disclosed credentials.',
        'HIGH',
        'CONTAINMENT',
        2
      ),
      task(
        'Send targeted user and leadership communications',
        'Notify impacted users, reinforce reporting steps, and update leadership if compromise extends beyond a single inbox.',
        'MEDIUM',
        'COMMUNICATIONS',
        3
      ),
      task(
        'Record tuning opportunities for mailbox defenses and user training',
        'Capture detections, awareness gaps, and mailbox protection improvements for follow-up.',
        'MEDIUM',
        'POST_INCIDENT_REVIEW',
        48
      )
    ],
    decisionLogPrompts: [
      'Was this a suspicious email only, or did it become an identity or endpoint incident?',
      'What evidence confirms link-click, attachment execution, or credential entry?',
      'What user population needs proactive notification or credential reset guidance?'
    ]
  },
  THIRD_PARTY_BREACH: {
    incidentType: 'THIRD_PARTY_BREACH',
    label: 'Third-party breach',
    description: 'Assess blast radius from a breached vendor, supplier, or SaaS dependency.',
    defaultTitle: 'Third-party breach response',
    defaultDescription:
      'Investigate vendor or supplier compromise, determine blast radius, rotate trust-chain credentials, and coordinate customer communications.',
    defaultSeverity: 'HIGH',
    defaultExecutiveSummary:
      'A vendor-linked incident requires dependency scoping, credential rotation, customer trust updates, and board-aware documentation.',
    recommendedRunbookId: 'third-party-breach',
    taskTemplates: [
      task(
        'Confirm affected vendors, integrations, and data flows',
        'Identify which vendors, subprocessors, credentials, and business workflows are inside the current blast radius.',
        'CRITICAL',
        'TRIAGE',
        1
      ),
      task(
        'Collect vendor notices, advisory details, and internal dependency evidence',
        'Preserve vendor notifications, contract/security documents, integration logs, and dependency ownership context.',
        'HIGH',
        'EVIDENCE_COLLECTION',
        2
      ),
      task(
        'Rotate shared secrets and restrict risky vendor access paths',
        'Reset tokens, rotate API keys, and reduce trust-chain exposure until the vendor posture is revalidated.',
        'HIGH',
        'CONTAINMENT',
        3
      ),
      task(
        'Prepare trust-facing and customer communications',
        'Align procurement, trust, and executive messaging with verified vendor impact and response facts.',
        'HIGH',
        'COMMUNICATIONS',
        4
      ),
      task(
        'Capture follow-up work for vendor governance and contingency planning',
        'Create owned improvements for vendor inventory, contract review, break-glass plans, and trust packet updates.',
        'HIGH',
        'POST_INCIDENT_REVIEW',
        72
      )
    ],
    decisionLogPrompts: [
      'Which vendors and integrations are in scope right now?',
      'What customer-facing commitments or trust materials need immediate update?',
      'What compensating controls are in place while the vendor incident remains open?'
    ]
  },
  CLOUD_EXPOSURE: {
    incidentType: 'CLOUD_EXPOSURE',
    label: 'Cloud exposure / misconfiguration',
    description: 'Investigate exposed storage, identity, network, or workload configuration risk.',
    defaultTitle: 'Cloud exposure investigation',
    defaultDescription:
      'Review suspected cloud misconfiguration or exposure, scope reachable assets and data, and apply immediate containment.',
    defaultSeverity: 'HIGH',
    defaultExecutiveSummary:
      'Potential cloud exposure requires rapid scoping of reachable assets, affected data, and compensating controls.',
    recommendedRunbookId: 'zero-day-vulnerability',
    taskTemplates: [
      task(
        'Identify exposed assets, data classes, and trust boundaries',
        'Confirm which buckets, workloads, identities, or network paths are exposed and whether sensitive data is involved.',
        'CRITICAL',
        'TRIAGE',
        1
      ),
      task(
        'Capture configuration state and access evidence before changing controls',
        'Preserve IAM, network, storage policy, and audit-log state to support later review.',
        'HIGH',
        'EVIDENCE_COLLECTION',
        2
      ),
      task(
        'Apply emergency access restrictions and configuration containment',
        'Close public access paths, narrow identity scope, and enforce safer network or workload policy.',
        'CRITICAL',
        'CONTAINMENT',
        2
      ),
      task(
        'Validate service recovery and monitoring coverage',
        'Confirm business services remain available and additional detections are in place for regression.',
        'HIGH',
        'RECOVERY',
        6
      ),
      task(
        'Capture control-hardening follow-up for cloud governance',
        'Create owned follow-ups for guardrails, change review, and baseline policy enforcement.',
        'HIGH',
        'POST_INCIDENT_REVIEW',
        48
      )
    ],
    decisionLogPrompts: [
      'What was exposed, for how long, and with what confidence?',
      'What customer, regulated, or internal-sensitive data classes were affected?',
      'What cloud control needs to change permanently after containment?'
    ]
  },
  LOST_DEVICE: {
    incidentType: 'LOST_DEVICE',
    label: 'Lost device / credential exposure',
    description: 'Contain device loss or credential exposure before it becomes broader compromise.',
    defaultTitle: 'Lost device or credential exposure response',
    defaultDescription:
      'Investigate a lost device or exposed credentials, contain access quickly, and determine whether broader compromise occurred.',
    defaultSeverity: 'MEDIUM',
    defaultExecutiveSummary:
      'Lost device or credential exposure requires immediate access review, remote-control decisions, and short-cycle follow-up.',
    recommendedRunbookId: 'identity-compromise',
    taskTemplates: [
      task(
        'Confirm device, user, and data exposure scope',
        'Validate what device or credential was exposed, what protections were enabled, and what systems were reachable.',
        'HIGH',
        'TRIAGE',
        1
      ),
      task(
        'Preserve relevant device, identity, and access evidence',
        'Collect MDM status, last check-in data, authentication events, and access changes tied to the exposed asset.',
        'HIGH',
        'EVIDENCE_COLLECTION',
        2
      ),
      task(
        'Revoke sessions and apply remote containment controls',
        'Reset credentials, wipe or lock the device if possible, and reduce privileged access until confidence is restored.',
        'HIGH',
        'CONTAINMENT',
        2
      ),
      task(
        'Issue concise user and stakeholder communications',
        'Inform relevant teams about current impact, expected user action, and the next update checkpoint.',
        'MEDIUM',
        'COMMUNICATIONS',
        3
      ),
      task(
        'Capture device management and credential-handling improvements',
        'Turn lessons on device controls, offline protection, and reporting speed into owned follow-up actions.',
        'MEDIUM',
        'POST_INCIDENT_REVIEW',
        48
      )
    ],
    decisionLogPrompts: [
      'What protections were active on the device or identity at the time of loss?',
      'What confidence do we have that access remained contained?',
      'What customer or internal communication is required?'
    ]
  },
  AI_MISUSE: {
    incidentType: 'AI_MISUSE',
    label: 'AI misuse / unsafe AI workflow',
    description: 'Investigate unsafe AI behavior, data leakage, or unapproved model usage.',
    defaultTitle: 'AI misuse investigation',
    defaultDescription:
      'Review suspected unsafe AI usage, data leakage, prompt injection impact, or unapproved AI workflow behavior.',
    defaultSeverity: 'HIGH',
    defaultExecutiveSummary:
      'Unsafe AI workflow activity requires containment of the workflow, evidence collection, governance escalation, and owned follow-up.',
    recommendedRunbookId: null,
    taskTemplates: [
      task(
        'Confirm the affected AI workflow, model path, and impacted data classes',
        'Identify the workflow owner, vendor or model family, prompts, outputs, and whether customer or regulated data was involved.',
        'CRITICAL',
        'TRIAGE',
        1
      ),
      task(
        'Collect prompts, outputs, logs, and vendor-side evidence',
        'Preserve model interactions, prompt history, outputs, access logs, and any policy or vendor-control evidence.',
        'HIGH',
        'EVIDENCE_COLLECTION',
        2
      ),
      task(
        'Disable or restrict the unsafe AI workflow pending review',
        'Remove external access, disable the workflow, or narrow input data until governance and security review is complete.',
        'HIGH',
        'CONTAINMENT',
        2
      ),
      task(
        'Coordinate AI governance, legal, and executive communication',
        'Align decision owners on customer impact, notification posture, and approval-path follow-up.',
        'HIGH',
        'COMMUNICATIONS',
        4
      ),
      task(
        'Create governance, training, and control follow-up actions',
        'Capture required policy changes, vendor reviews, human review rules, and workflow guardrails.',
        'HIGH',
        'POST_INCIDENT_REVIEW',
        72
      )
    ],
    decisionLogPrompts: [
      'Was this approved AI usage that behaved unsafely, or an unapproved workflow entirely?',
      'What data classes or commitments were exposed through the AI path?',
      'Which AI governance controls failed or were missing at the time of incident?'
    ]
  },
  OTHER: {
    incidentType: 'OTHER',
    label: 'Custom incident',
    description: 'Start a practical incident record and first-hour response plan for a custom scenario.',
    defaultTitle: 'Security incident investigation',
    defaultDescription:
      'Establish the incident record, first-hour actions, evidence collection steps, and communications owners for a custom scenario.',
    defaultSeverity: 'MEDIUM',
    defaultExecutiveSummary:
      'A custom incident requires a scoped first-hour plan, owned communication path, and durable decision trail.',
    recommendedRunbookId: null,
    taskTemplates: [
      task(
        'Confirm incident scope, owner, and immediate impact',
        'Define what is confirmed, what is assumed, and what business systems or data may be affected.',
        'HIGH',
        'TRIAGE',
        1
      ),
      task(
        'Preserve the first available evidence set',
        'Capture logs, screenshots, telemetry, or artifacts before the environment changes.',
        'HIGH',
        'EVIDENCE_COLLECTION',
        2
      ),
      task(
        'Apply the safest immediate containment action',
        'Reduce further exposure while preserving enough evidence for later review.',
        'HIGH',
        'CONTAINMENT',
        2
      ),
      task(
        'Set the next leadership update window and owner',
        'Document who is sending the next update and what new facts must be confirmed first.',
        'MEDIUM',
        'COMMUNICATIONS',
        3
      ),
      task(
        'Capture follow-up improvements once the incident stabilizes',
        'Record process, control, and ownership changes that should result from the incident.',
        'MEDIUM',
        'POST_INCIDENT_REVIEW',
        48
      )
    ],
    decisionLogPrompts: [
      'What is confirmed right now versus still unverified?',
      'What single containment action reduces the most risk in the next hour?',
      'Who owns the next internal update and what time is it due?'
    ]
  }
};

function dedupeTasks(tasks: ResponseTaskTemplate[]) {
  const seen = new Set<string>();
  return tasks.filter((item) => {
    const key = `${item.phase}:${item.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function severityAdjustedPriority(priority: TaskPriority, severity: IncidentSeverity): TaskPriority {
  if (severity !== 'CRITICAL') return priority;
  if (priority === 'LOW') return 'MEDIUM';
  if (priority === 'MEDIUM') return 'HIGH';
  return priority;
}

export function listIncidentScenarioSummaries(): ScenarioSummary[] {
  return Object.values(scenarioTemplates).map((template) => ({
    incidentType: template.incidentType,
    label: template.label,
    description: template.description,
    defaultSeverity: template.defaultSeverity,
    recommendedRunbookId: template.recommendedRunbookId
  }));
}

export function getIncidentScenarioTemplate(incidentType: IncidentType) {
  return scenarioTemplates[incidentType];
}

export function buildIncidentTaskTemplates(args: {
  incidentType: IncidentType;
  severity: IncidentSeverity;
}) {
  const scenario = getIncidentScenarioTemplate(args.incidentType);
  const runbook = scenario.recommendedRunbookId ? getSecurityRunbookById(scenario.recommendedRunbookId) : null;
  const runbookTasks: ResponseTaskTemplate[] =
    runbook?.tasks.map((item) => ({
      title: item.title,
      details: item.details,
      priority: severityAdjustedPriority(item.priority, args.severity),
      phase: item.phase ?? 'TRIAGE',
      dueOffsetHours:
        typeof item.dueOffsetHours === 'number' ? item.dueOffsetHours : Math.max(1, item.dueOffsetDays * 24)
    })) ?? [];

  const scenarioTasks = scenario.taskTemplates.map((item) => ({
    ...item,
    priority: severityAdjustedPriority(item.priority, args.severity)
  }));

  return dedupeTasks([...scenarioTasks, ...runbookTasks]).sort((left, right) => {
    if (left.dueOffsetHours !== right.dueOffsetHours) {
      return left.dueOffsetHours - right.dueOffsetHours;
    }

    return left.title.localeCompare(right.title);
  });
}

export function buildIncidentDefaults(args: {
  incidentType: IncidentType;
  severity?: IncidentSeverity;
  title?: string | null;
  description?: string | null;
}) {
  const scenario = getIncidentScenarioTemplate(args.incidentType);
  const severity = args.severity ?? scenario.defaultSeverity;

  return {
    incidentType: args.incidentType,
    severity,
    title: args.title?.trim() || scenario.defaultTitle,
    description: args.description?.trim() || scenario.defaultDescription,
    executiveSummary: `${scenario.defaultExecutiveSummary} Current severity: ${severity}.`,
    recommendedRunbookId: scenario.recommendedRunbookId,
    decisionLogPrompts: scenario.decisionLogPrompts,
    taskTemplates: buildIncidentTaskTemplates({
      incidentType: args.incidentType,
      severity
    })
  };
}
