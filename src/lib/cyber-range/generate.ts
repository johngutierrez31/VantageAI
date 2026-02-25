import type { CyberRangeGenerationRequest } from '@/lib/validation/cyber-range';

type Zone = {
  name: string;
  purpose: string;
  components: string[];
  trustLevel: 'privileged' | 'semi_trusted' | 'neutral' | 'adversarial' | 'target';
};

type Phase = {
  order: number;
  title: string;
  deliverables: string[];
};

type CapacityProfile = {
  vmTarget: string;
  vcpuTarget: string;
  ramTarget: string;
  storageTarget: string;
};

export type CyberRangePlan = {
  planId: string;
  generatedAt: string;
  input: CyberRangeGenerationRequest;
  zones: Zone[];
  phases: Phase[];
  capacity: CapacityProfile;
  resetStrategy: {
    teamResetTargetMinutes: number;
    fullResetTargetMinutes: number;
    baselineMethod: string;
  };
  successCriteria: string[];
  markdown: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function toLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (part) => part.toUpperCase());
}

function buildBaseZones(input: CyberRangeGenerationRequest): Zone[] {
  const zones: Zone[] = [
    {
      name: 'Core Infrastructure',
      purpose: 'Hosts hypervisor, storage, and protected management services.',
      trustLevel: 'privileged',
      components: ['Hypervisor cluster', 'Storage tiering', 'Network control plane']
    },
    {
      name: 'White Team',
      purpose: 'Controls timeline, injects events, and scores exercise execution.',
      trustLevel: 'privileged',
      components: ['Exercise orchestration', 'Inject controller', 'Observer dashboards']
    },
    {
      name: 'Access Zone',
      purpose: 'Provides participant access and collaboration interfaces.',
      trustLevel: 'semi_trusted',
      components: ['Portal and SSO proxy', 'VM access broker', 'Participant comms']
    },
    {
      name: 'Red Zone',
      purpose: 'Hosts adversary tooling and controlled attack infrastructure.',
      trustLevel: 'adversarial',
      components: ['C2 staging', 'Adversary payload repo', 'Traffic egress controls']
    },
    {
      name: 'Grey Zone',
      purpose: 'Simulates internet and third-party dependency traffic.',
      trustLevel: 'neutral',
      components: ['DNS hierarchy simulation', 'Web content mirrors', 'ISP routing simulation']
    },
    {
      name: 'Blue Zone',
      purpose: 'Represents the defended enterprise environment.',
      trustLevel: 'target',
      components: ['Directory services', 'User workstations', 'SIEM/EDR telemetry stack']
    }
  ];

  if (input.includeIdentityZone) {
    zones.push({
      name: 'Identity Zone',
      purpose: 'Simulates modern identity federation and zero-trust controls.',
      trustLevel: 'privileged',
      components: ['IdP replica', 'MFA workflow', 'Certificate authority services']
    });
  }

  if (input.includeOtZone) {
    zones.push({
      name: 'OT/ICS Zone',
      purpose: 'Adds industrial components and operational technology attack paths.',
      trustLevel: 'target',
      components: ['SCADA protocol simulator', 'PLC test subnet', 'Engineering workstation']
    });
  }

  return zones;
}

function buildCapacity(scale: CyberRangeGenerationRequest['scale']): CapacityProfile {
  if (scale === 'small') {
    return {
      vmTarget: '50-100',
      vcpuTarget: '200-400',
      ramTarget: '256-512 GB',
      storageTarget: '2-5 TB'
    };
  }

  if (scale === 'medium') {
    return {
      vmTarget: '100-500',
      vcpuTarget: '500-2,000',
      ramTarget: '1-4 TB',
      storageTarget: '5-15 TB'
    };
  }

  return {
    vmTarget: '500-2,000',
    vcpuTarget: '2,000-8,000',
    ramTarget: '4-16 TB',
    storageTarget: '15-40 TB'
  };
}

function buildPhases(input: CyberRangeGenerationRequest): Phase[] {
  const phases: Phase[] = [
    {
      order: 1,
      title: 'Foundation',
      deliverables: [
        `Provision ${toLabel(input.environment)} substrate`,
        'Create core infrastructure and white team zones',
        'Define baseline observability and backup policies'
      ]
    },
    {
      order: 2,
      title: 'Identity & Network Core',
      deliverables: [
        'Build routing and segmentation model',
        'Deploy DNS and directory services',
        input.includeIdentityZone ? 'Integrate federation and MFA controls' : 'Document deferred identity-zone rollout'
      ]
    },
    {
      order: 3,
      title: 'Enterprise & Adversary Simulation',
      deliverables: [
        'Deploy blue zone services and telemetry stack',
        'Stand up red zone adversary infrastructure',
        input.includeNpcTraffic ? 'Enable NPC background traffic generation' : 'Define manual traffic simulation fallback'
      ]
    },
    {
      order: 4,
      title: 'Exercise Readiness',
      deliverables: [
        'Run dry-run with white team operators',
        `Validate participant load target: ${input.participants.toLocaleString()} users`,
        'Freeze golden snapshots and publish reset runbook'
      ]
    }
  ];

  if (input.includeOtZone) {
    phases.splice(3, 0, {
      order: 4,
      title: 'OT/ICS Extension',
      deliverables: [
        'Integrate OT simulation network',
        'Define safety guardrails and blast-radius controls',
        'Map OT incidents to blue team playbooks'
      ]
    });
    phases.forEach((phase, index) => {
      phase.order = index + 1;
    });
  }

  return phases;
}

function buildSuccessCriteria(input: CyberRangeGenerationRequest) {
  const goals = [
    `Exercise can be reset within ${input.scale === 'small' ? 20 : input.scale === 'medium' ? 40 : 60} minutes.`,
    `${input.participants.toLocaleString()} participants can access assigned environments concurrently.`,
    `Scenario fidelity meets ${input.fidelity.toUpperCase()} standard with reproducible scoring outputs.`,
    'White team can track inject timeline, detection coverage, and response SLA without manual spreadsheet work.'
  ];

  if (input.includeNpcTraffic) {
    goals.push('Background traffic baseline exists so adversary activity is not trivially obvious.');
  }

  if (input.includeOtZone) {
    goals.push('OT/ICS exercise track includes documented safety controls and rollback checkpoints.');
  }

  return goals;
}

function buildMarkdown(plan: Omit<CyberRangePlan, 'markdown'>) {
  const lines: string[] = [];
  lines.push(`# ${plan.input.rangeName}`);
  lines.push('');
  lines.push(`- **Plan ID:** ${plan.planId}`);
  lines.push(`- **Generated At:** ${plan.generatedAt}`);
  lines.push(`- **Organization:** ${plan.input.organizationName}`);
  lines.push(`- **Primary Use Case:** ${plan.input.primaryUseCase}`);
  lines.push(`- **Environment:** ${toLabel(plan.input.environment)}`);
  lines.push(`- **Fidelity:** ${plan.input.fidelity.toUpperCase()}`);
  lines.push(`- **Duration:** ${plan.input.durationDays} day(s)`);
  lines.push(`- **Participants:** ${plan.input.participants.toLocaleString()}`);
  lines.push('');

  if (plan.input.complianceTags.length > 0) {
    lines.push('## Compliance Tags');
    lines.push('');
    for (const tag of plan.input.complianceTags) {
      lines.push(`- ${tag}`);
    }
    lines.push('');
  }

  lines.push('## Zone Architecture');
  lines.push('');
  for (const zone of plan.zones) {
    lines.push(`### ${zone.name}`);
    lines.push(`- **Trust Level:** ${toLabel(zone.trustLevel)}`);
    lines.push(`- **Purpose:** ${zone.purpose}`);
    lines.push('- **Core Components:**');
    for (const component of zone.components) {
      lines.push(`  - ${component}`);
    }
    lines.push('');
  }

  lines.push('## Capacity Targets');
  lines.push('');
  lines.push(`- **VM target:** ${plan.capacity.vmTarget}`);
  lines.push(`- **vCPU target:** ${plan.capacity.vcpuTarget}`);
  lines.push(`- **RAM target:** ${plan.capacity.ramTarget}`);
  lines.push(`- **Storage target:** ${plan.capacity.storageTarget}`);
  lines.push('');

  lines.push('## Implementation Phases');
  lines.push('');
  for (const phase of plan.phases) {
    lines.push(`### Phase ${phase.order}: ${phase.title}`);
    for (const deliverable of phase.deliverables) {
      lines.push(`- ${deliverable}`);
    }
    lines.push('');
  }

  lines.push('## Reset Strategy');
  lines.push('');
  lines.push(`- Team reset target: ${plan.resetStrategy.teamResetTargetMinutes} minutes`);
  lines.push(`- Full range reset target: ${plan.resetStrategy.fullResetTargetMinutes} minutes`);
  lines.push(`- Baseline method: ${plan.resetStrategy.baselineMethod}`);
  lines.push('');

  lines.push('## Success Criteria');
  lines.push('');
  for (const criterion of plan.successCriteria) {
    lines.push(`- ${criterion}`);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function generateCyberRangePlan(input: CyberRangeGenerationRequest): CyberRangePlan {
  const generatedAt = new Date().toISOString();
  const planId = `range-${slugify(input.rangeName)}-${generatedAt.slice(0, 10)}`;
  const zones = buildBaseZones(input);
  const phases = buildPhases(input);
  const capacity = buildCapacity(input.scale);
  const resetStrategy = {
    teamResetTargetMinutes: input.scale === 'small' ? 10 : input.scale === 'medium' ? 20 : 30,
    fullResetTargetMinutes: input.scale === 'small' ? 30 : input.scale === 'medium' ? 60 : 90,
    baselineMethod: 'Golden image + linked-clone snapshots with IaC validation'
  };
  const successCriteria = buildSuccessCriteria(input);

  const planWithoutMarkdown = {
    planId,
    generatedAt,
    input,
    zones,
    phases,
    capacity,
    resetStrategy,
    successCriteria
  };

  return {
    ...planWithoutMarkdown,
    markdown: buildMarkdown(planWithoutMarkdown)
  };
}
