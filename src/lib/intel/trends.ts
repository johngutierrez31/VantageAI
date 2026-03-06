export type TrendSeverity = 'critical' | 'high' | 'medium';

export type TrendMetric = {
  label: string;
  value: string;
};

export type TrendSource = {
  name: string;
  publishedOn: string;
  url: string;
};

export type TrendSignal = {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  severity: TrendSeverity;
  observedWindow: string;
  metrics: TrendMetric[];
  operatorActions: string[];
  tags: string[];
  sourceSet: TrendSource[];
};

export type SoloCisoCapability = {
  id: string;
  title: string;
  outcome: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  linkedRoute: string;
  mappedTrendIds: string[];
  actions: string[];
};

const severityOrder: Record<TrendSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2
};

const trendSignals: TrendSignal[] = [
  {
    id: 'identity-velocity',
    title: 'Identity attacks keep accelerating',
    summary:
      'Credential theft, account takeover, and identity abuse continue to outpace malware-only campaigns.',
    whyItMatters:
      'A solo operator needs identity-first controls because attacker speed is now measured in minutes, not days.',
    severity: 'critical',
    observedWindow: '2025-2026',
    metrics: [
      { label: 'Microsoft observed identity attacks', value: '600M/day' },
      { label: 'CrowdStrike vishing growth', value: '+442% YoY' },
      { label: 'IBM infostealer presence in incidents', value: '28%' }
    ],
    operatorActions: [
      'Enforce phishing-resistant MFA for admins and critical SaaS.',
      'Rotate and monitor high-privilege credentials on a fixed cadence.',
      'Alert on impossible travel, anomalous MFA resets, and token theft patterns.'
    ],
    tags: ['identity', 'phishing', 'credential-access'],
    sourceSet: [
      {
        name: 'Microsoft Digital Defense Report 2025',
        publishedOn: '2025-10-15',
        url: 'https://www.microsoft.com/en-us/security/security-insider/microsoft-digital-defense-report-2025'
      },
      {
        name: 'CrowdStrike Global Threat Report 2026',
        publishedOn: '2026-02-26',
        url: 'https://www.crowdstrike.com/en-us/global-threat-report/'
      },
      {
        name: 'IBM X-Force Threat Intelligence Index 2026',
        publishedOn: '2026-02-24',
        url: 'https://www.ibm.com/reports/threat-intelligence'
      }
    ]
  },
  {
    id: 'breakout-speed',
    title: 'Adversary breakout speed is compressing',
    summary:
      'Attackers move from initial foothold to lateral action rapidly, reducing tolerance for manual response.',
    whyItMatters:
      'If your process is not automation-assisted, containment may happen after impact. Playbooks must be pre-built.',
    severity: 'critical',
    observedWindow: '2025-2026',
    metrics: [
      { label: 'CrowdStrike average breakout time', value: '48 minutes' },
      { label: 'Fastest observed breakout', value: '51 seconds' },
      { label: 'Palo Alto Unit 42 incidents with sub-1h keyboard activity', value: '25%' }
    ],
    operatorActions: [
      'Create first-hour containment runbooks for account compromise and ransomware.',
      'Pre-authorize emergency actions (disable user, isolate host, revoke tokens).',
      'Use SIEM/EDR automation for high-confidence detections.'
    ],
    tags: ['incident-response', 'lateral-movement', 'automation'],
    sourceSet: [
      {
        name: 'CrowdStrike Global Threat Report 2026',
        publishedOn: '2026-02-26',
        url: 'https://www.crowdstrike.com/en-us/press-releases/2026-crowdstrike-global-threat-report-reveals-adversaries-increasingly-weaponized-legitimate-tools-and-techniques/'
      },
      {
        name: 'Unit 42 Cloud Threat Report 2026',
        publishedOn: '2026-02-24',
        url: 'https://www.paloaltonetworks.com/resources/research/unit-42-cloud-threat-report-2026'
      }
    ]
  },
  {
    id: 'vulnerability-initial-access',
    title: 'Exploited vulnerabilities remain a top initial access path',
    summary:
      'Public-facing flaws and delayed patching are still heavily used for intrusions.',
    whyItMatters:
      'A one-person team needs ruthless patch prioritization tied to exploitability, not just CVSS.',
    severity: 'critical',
    observedWindow: '2025',
    metrics: [
      { label: 'Mandiant intrusions via exploited vulnerabilities', value: '33%' },
      { label: 'Verizon breaches using vulnerability exploitation as initial access', value: '20%' },
      { label: 'Mandiant intrusions via stolen credentials', value: '16%' }
    ],
    operatorActions: [
      'Maintain an internet-facing asset inventory with patch SLA by criticality.',
      'Patch KEV-like/high-exploitability vulnerabilities before broad backlog items.',
      'Track mean-time-to-remediate for externally exposed assets weekly.'
    ],
    tags: ['vulnerability-management', 'external-attack-surface', 'patching'],
    sourceSet: [
      {
        name: 'Mandiant M-Trends 2025',
        publishedOn: '2025-04-24',
        url: 'https://cloud.google.com/blog/topics/threat-intelligence/m-trends-2025'
      },
      {
        name: 'Verizon DBIR 2025',
        publishedOn: '2025-04-23',
        url: 'https://www.verizon.com/business/resources/T23c/reports/2025-dbir-data-breach-investigations-report.pdf'
      }
    ]
  },
  {
    id: 'cloud-and-saas-abuse',
    title: 'Cloud and SaaS abuse keeps expanding',
    summary:
      'Attackers increasingly target cloud identities, exposed management planes, and SaaS trust relationships.',
    whyItMatters:
      'Cloud misconfiguration and identity drift can quietly create high-impact exposure for small teams.',
    severity: 'high',
    observedWindow: '2025-2026',
    metrics: [
      { label: 'CrowdStrike cloud-conscious cases', value: '+26% YoY' },
      { label: 'Unit 42 incidents involving cloud attacks', value: '29%' },
      { label: 'Unit 42 cloud attack paths observed across four vectors', value: '80%' }
    ],
    operatorActions: [
      'Review cloud IAM and service-account sprawl weekly.',
      'Monitor new public exposures in storage, identity providers, and API gateways.',
      'Apply least privilege and short-lived credentials for automation accounts.'
    ],
    tags: ['cloud-security', 'saas-risk', 'identity'],
    sourceSet: [
      {
        name: 'CrowdStrike Global Threat Report 2026',
        publishedOn: '2026-02-26',
        url: 'https://www.crowdstrike.com/en-us/global-threat-report/'
      },
      {
        name: 'Unit 42 Cloud Threat Report 2026',
        publishedOn: '2026-02-24',
        url: 'https://www.paloaltonetworks.com/resources/research/unit-42-cloud-threat-report-2026'
      }
    ]
  },
  {
    id: 'third-party-concentration',
    title: 'Third-party concentration risk is rising',
    summary:
      'Compromises increasingly involve suppliers, platforms, and shared dependencies.',
    whyItMatters:
      'Solo defenders need a lightweight but strict third-party minimum control baseline and evidence packet.',
    severity: 'high',
    observedWindow: '2024-2025',
    metrics: [
      { label: 'Verizon breaches involving third parties', value: '30% (2x YoY)' },
      { label: 'Unit 42 cloud extortion incidents', value: '66%' },
      { label: 'ENISA incidents with supply-chain impact in reporting period', value: '17%' }
    ],
    operatorActions: [
      'Maintain a critical vendor register with security attestations and contacts.',
      'Pre-stage contingency playbooks for key SaaS/provider outage or breach.',
      'Require MFA, logging, and incident-notification clauses in vendor security terms.'
    ],
    tags: ['third-party-risk', 'supply-chain', 'resilience'],
    sourceSet: [
      {
        name: 'Verizon DBIR 2025',
        publishedOn: '2025-04-23',
        url: 'https://www.verizon.com/business/resources/T23f/reports/2025-dbir-executive-summary.pdf'
      },
      {
        name: 'Unit 42 Cloud Threat Report 2026',
        publishedOn: '2026-02-24',
        url: 'https://www.paloaltonetworks.com/resources/research/unit-42-cloud-threat-report-2026'
      },
      {
        name: 'ENISA Threat Landscape 2024',
        publishedOn: '2024-11-20',
        url: 'https://www.enisa.europa.eu/publications/enisa-threat-landscape-2024'
      }
    ]
  },
  {
    id: 'critical-infrastructure-targeting',
    title: 'Critical infrastructure and operational sectors remain heavily targeted',
    summary:
      'Manufacturing, telecom, and other infrastructure sectors continue to attract persistent adversary activity.',
    whyItMatters:
      'If your business supports critical operations, resilience and recovery controls must be designed up front.',
    severity: 'high',
    observedWindow: '2025-2026',
    metrics: [
      { label: 'IBM attacks against critical infrastructure sectors', value: '70%' },
      { label: 'IBM share of those attacks targeting manufacturing', value: '26%' },
      { label: 'CrowdStrike China telecom targeting growth', value: '+200% to +300%' }
    ],
    operatorActions: [
      'Map mission-critical services and define RTO/RPO with tested recovery paths.',
      'Create segmented incident-response playbooks for operational and customer-facing systems.',
      'Tabletop communications and business continuity procedures quarterly.'
    ],
    tags: ['resilience', 'ot', 'business-continuity'],
    sourceSet: [
      {
        name: 'IBM X-Force Threat Intelligence Index 2026',
        publishedOn: '2026-02-24',
        url: 'https://newsroom.ibm.com/2026-02-24-IBM-X-Force-2026-Threat-Intelligence-Index-Identity-Attacks-Rise-as-Critical-Infrastructure-Sees-Major-Increase-in-Cyber-Attacks'
      },
      {
        name: 'CrowdStrike Global Threat Report 2026',
        publishedOn: '2026-02-26',
        url: 'https://www.crowdstrike.com/en-us/press-releases/2026-crowdstrike-global-threat-report-reveals-adversaries-increasingly-weaponized-legitimate-tools-and-techniques/'
      }
    ]
  },
  {
    id: 'ransomware-extortion-economics',
    title: 'Extortion economics still drive ransomware behavior',
    summary:
      'Ransom and extortion campaigns remain financially optimized and operationally persistent.',
    whyItMatters:
      'Preparedness depends on restoration maturity, legal response readiness, and evidence-backed decision support.',
    severity: 'high',
    observedWindow: '2024-2025',
    metrics: [
      { label: 'Verizon median ransom in 2024 incidents', value: '$115,000' },
      { label: 'ENISA ransomware share in observed incidents', value: '41%' },
      { label: 'Mandiant median global dwell time', value: '11 days' }
    ],
    operatorActions: [
      'Test backup restoration and immutable snapshot recovery monthly.',
      'Prepare legal, PR, and regulator communication templates ahead of incidents.',
      'Track exfiltration indicators and establish rapid containment for data staging behavior.'
    ],
    tags: ['ransomware', 'recovery', 'business-impact'],
    sourceSet: [
      {
        name: 'Verizon DBIR 2025',
        publishedOn: '2025-04-23',
        url: 'https://www.verizon.com/business/resources/T23f/reports/2025-dbir-executive-summary.pdf'
      },
      {
        name: 'ENISA Threat Landscape 2024',
        publishedOn: '2024-11-20',
        url: 'https://www.enisa.europa.eu/publications/enisa-threat-landscape-2024'
      },
      {
        name: 'Mandiant M-Trends 2025',
        publishedOn: '2025-04-24',
        url: 'https://cloud.google.com/blog/topics/threat-intelligence/m-trends-2025'
      }
    ]
  }
];

const capabilities: SoloCisoCapability[] = [
  {
    id: 'daily-command',
    title: 'Daily Command Loop',
    outcome: 'Review risk pulse and execute one high-impact security action each day.',
    cadence: 'daily',
    linkedRoute: '/app/command-center',
    mappedTrendIds: ['breakout-speed', 'identity-velocity'],
    actions: [
      'Review overnight alerts, backlog changes, and emerging threat signals.',
      'Select one top risk reduction action and finish it before context-switching.',
      'Log the decision and evidence trail for later audit and reporting.'
    ]
  },
  {
    id: 'identity-hardening',
    title: 'Identity and Access Hardening',
    outcome: 'Reduce credential abuse and privilege escalation risk.',
    cadence: 'weekly',
    linkedRoute: '/app/security-analyst',
    mappedTrendIds: ['identity-velocity', 'cloud-and-saas-abuse'],
    actions: [
      'Audit privileged accounts, stale tokens, and risky auth exceptions.',
      'Verify MFA coverage for admins, support staff, and external access.',
      'Tighten role scopes and remove unused elevated grants.'
    ]
  },
  {
    id: 'vuln-burn-down',
    title: 'Exploit-Driven Patch Burn-down',
    outcome: 'Prioritize vulnerability remediation by exploitation likelihood and blast radius.',
    cadence: 'weekly',
    linkedRoute: '/app/findings',
    mappedTrendIds: ['vulnerability-initial-access'],
    actions: [
      'Sort internet-facing vulnerabilities by exploit evidence and business impact.',
      'Track patch SLA compliance for externally reachable services.',
      'Convert overdue critical findings into tracked remediation tasks.'
    ]
  },
  {
    id: 'ir-readiness',
    title: 'First-Hour Incident Readiness',
    outcome: 'Contain high-confidence incidents quickly without decision paralysis.',
    cadence: 'weekly',
    linkedRoute: '/app/security-analyst',
    mappedTrendIds: ['breakout-speed', 'ransomware-extortion-economics'],
    actions: [
      'Rehearse account compromise and ransomware first-hour steps.',
      'Validate escalation tree with legal and leadership stakeholders.',
      'Keep an updated evidence collection checklist for forensic continuity.'
    ]
  },
  {
    id: 'evidence-freshness',
    title: 'Evidence and Trust Packet Freshness',
    outcome: 'Keep customer and audit responses current with minimal manual scramble.',
    cadence: 'weekly',
    linkedRoute: '/app/trust/inbox',
    mappedTrendIds: ['third-party-concentration'],
    actions: [
      'Refresh stale evidence linked to critical controls.',
      'Pre-package frequently requested trust artifacts for rapid response.',
      'Tag evidence by framework and owner to reduce retrieval latency.'
    ]
  },
  {
    id: 'policy-governance',
    title: 'Policy and Control Governance',
    outcome: 'Sustain compliance readiness while adapting to evolving attack patterns.',
    cadence: 'monthly',
    linkedRoute: '/app/policies',
    mappedTrendIds: ['third-party-concentration', 'identity-velocity'],
    actions: [
      'Regenerate high-priority policies with updated owner and review metadata.',
      'Map policy controls to active threat scenarios and test evidence linkage.',
      'Track upcoming policy review dates and assign accountable owners.'
    ]
  },
  {
    id: 'range-validation',
    title: 'Scenario Validation via Cyber Range',
    outcome: 'Test response and architecture assumptions before incidents force them.',
    cadence: 'monthly',
    linkedRoute: '/app/cyber-range',
    mappedTrendIds: ['critical-infrastructure-targeting', 'breakout-speed'],
    actions: [
      'Model one realistic adversary scenario based on current trend signals.',
      'Validate containment timing and communication handoffs.',
      'Feed lessons learned into architecture and playbook updates.'
    ]
  }
];

export function getTrendSignals() {
  return [...trendSignals].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.title.localeCompare(b.title);
  });
}

export function getSoloCisoCapabilities() {
  return [...capabilities];
}

export function getTopTrendActions(limit = 10) {
  const actions = getTrendSignals().flatMap((signal) =>
    signal.operatorActions.map((action) => ({
      trendId: signal.id,
      trendTitle: signal.title,
      severity: signal.severity,
      action
    }))
  );

  return actions.slice(0, Math.max(1, limit));
}

