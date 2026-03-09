import { type ResponseOpsPhase, TaskPriority } from '@prisma/client';

export type RunbookTaskTemplate = {
  title: string;
  details: string;
  priority: TaskPriority;
  dueOffsetDays: number;
  dueOffsetHours?: number;
  phase?: ResponseOpsPhase;
};

export type SecurityRunbook = {
  id: string;
  title: string;
  objective: string;
  severity: 'critical' | 'high' | 'medium';
  scenarios: string[];
  linkedRoute: string;
  tasks: RunbookTaskTemplate[];
};

const runbooks: SecurityRunbook[] = [
  {
    id: 'identity-compromise',
    title: 'Identity Compromise',
    objective: 'Contain account takeover and privilege abuse fast.',
    severity: 'critical',
    scenarios: ['Impossible travel alerts', 'Unexpected MFA resets', 'Admin role escalation'],
    linkedRoute: '/app/security-analyst',
    tasks: [
      {
        title: 'Disable compromised identity and revoke active sessions',
        details: 'Disable user, revoke refresh tokens, and rotate privileged credentials immediately.',
        priority: 'CRITICAL',
        dueOffsetDays: 0,
        dueOffsetHours: 1,
        phase: 'TRIAGE'
      },
      {
        title: 'Collect identity logs and suspicious sign-in artifacts',
        details: 'Capture auth logs, IP addresses, MFA events, and role changes for investigation.',
        priority: 'HIGH',
        dueOffsetDays: 1,
        dueOffsetHours: 2,
        phase: 'EVIDENCE_COLLECTION'
      },
      {
        title: 'Run post-incident access review',
        details: 'Review privilege assignments and close unnecessary elevated access.',
        priority: 'HIGH',
        dueOffsetDays: 2,
        phase: 'POST_INCIDENT_REVIEW'
      }
    ]
  },
  {
    id: 'ransomware-extortion',
    title: 'Ransomware / Extortion',
    objective: 'Contain spread, preserve evidence, and execute recovery strategy.',
    severity: 'critical',
    scenarios: ['Mass encryption behavior', 'Data staging and exfiltration', 'Extortion demand received'],
    linkedRoute: '/app/security-analyst',
    tasks: [
      {
        title: 'Isolate affected hosts and high-risk segments',
        details: 'Execute host isolation and block known C2/exfiltration paths.',
        priority: 'CRITICAL',
        dueOffsetDays: 0,
        dueOffsetHours: 1,
        phase: 'CONTAINMENT'
      },
      {
        title: 'Validate backup integrity and restoration path',
        details: 'Confirm immutable backups and test restore sequence for critical systems.',
        priority: 'HIGH',
        dueOffsetDays: 1,
        dueOffsetHours: 4,
        phase: 'RECOVERY'
      },
      {
        title: 'Prepare legal and customer communication package',
        details: 'Coordinate incident narrative, notification obligations, and executive updates.',
        priority: 'HIGH',
        dueOffsetDays: 1,
        dueOffsetHours: 3,
        phase: 'COMMUNICATIONS'
      }
    ]
  },
  {
    id: 'zero-day-vulnerability',
    title: 'Zero-Day / Emergency Patch',
    objective: 'Reduce exposure from emergent exploit activity across public systems.',
    severity: 'high',
    scenarios: ['KEV-style urgent advisory', 'Vendor hotfix release', 'Exploit in public PoC'],
    linkedRoute: '/app/findings',
    tasks: [
      {
        title: 'Identify all impacted internet-facing assets',
        details: 'Map affected software versions and prioritize externally reachable systems.',
        priority: 'CRITICAL',
        dueOffsetDays: 0,
        dueOffsetHours: 2,
        phase: 'TRIAGE'
      },
      {
        title: 'Apply emergency mitigation or patch',
        details: 'Patch where possible; otherwise apply compensating controls and restrictions.',
        priority: 'HIGH',
        dueOffsetDays: 1,
        dueOffsetHours: 6,
        phase: 'CONTAINMENT'
      },
      {
        title: 'Verify remediation and monitor exploit indicators',
        details: 'Run follow-up scans and monitor suspicious traffic for regression.',
        priority: 'HIGH',
        dueOffsetDays: 2,
        phase: 'RECOVERY'
      }
    ]
  },
  {
    id: 'third-party-breach',
    title: 'Third-Party Breach Response',
    objective: 'Contain trust-chain risk and maintain customer assurance.',
    severity: 'high',
    scenarios: ['SaaS provider breach', 'Supplier credential exposure', 'Compromised integration token'],
    linkedRoute: '/app/trust/inbox',
    tasks: [
      {
        title: 'Assess blast radius of impacted vendor integrations',
        details: 'Identify data flows, credentials, and dependencies tied to affected provider.',
        priority: 'HIGH',
        dueOffsetDays: 0,
        dueOffsetHours: 2,
        phase: 'TRIAGE'
      },
      {
        title: 'Rotate shared secrets and integration credentials',
        details: 'Revoke and re-issue tokens, API keys, and service credentials linked to vendor.',
        priority: 'HIGH',
        dueOffsetDays: 1,
        dueOffsetHours: 4,
        phase: 'CONTAINMENT'
      },
      {
        title: 'Update trust packet and customer communication notes',
        details: 'Prepare concise impact and response summary for customers and auditors.',
        priority: 'MEDIUM',
        dueOffsetDays: 2,
        phase: 'COMMUNICATIONS'
      }
    ]
  }
];

export function getSecurityRunbooks() {
  return [...runbooks];
}

export function getSecurityRunbookById(runbookId: string) {
  return runbooks.find((runbook) => runbook.id === runbookId) ?? null;
}
