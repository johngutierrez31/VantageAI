import type {
  AIDeploymentContext,
  AIDataClass,
  AIPolicyRequirement,
  AIRetentionStatus,
  AIRiskTier,
  AIUseCaseType,
  AIWorkflowType,
  AIYesNoUnknown
} from '@prisma/client';
import { getPolicyCatalog } from '@/lib/policy-generator/library';

export type AIPolicyDecision = 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED';

export type EvaluatedAIGovernancePolicy = {
  riskTier: AIRiskTier;
  humanReviewRequired: boolean;
  allowedDataClasses: AIDataClass[];
  restrictedDataClasses: AIDataClass[];
  prohibitedDataClasses: AIDataClass[];
  matchedPolicyIds: string[];
  requiredConditions: AIPolicyRequirement[];
  unmetRequirements: AIPolicyRequirement[];
  approvalBlockers: AIPolicyRequirement[];
  decisionConditions: string[];
  primaryRisks: string[];
  requiredControls: string[];
  recommendedDecision: AIPolicyDecision;
  notes: string[];
};

export type EvaluateAIGovernancePolicyArgs = {
  useCaseType?: AIUseCaseType;
  workflowType?: AIWorkflowType;
  deploymentContext?: AIDeploymentContext;
  dataClasses: AIDataClass[];
  linkedPolicyIds?: string[];
  customerDataInvolved: AIYesNoUnknown;
  regulatedDataInvolved: AIYesNoUnknown;
  secretsInvolved: AIYesNoUnknown;
  externalToolAccess: AIYesNoUnknown;
  internetAccess: AIYesNoUnknown;
  humanReviewRequired: boolean;
  vendorSignals?: {
    hasApprovedVendorReview?: boolean;
    retentionPolicyStatus?: AIRetentionStatus;
    trainsOnCustomerData?: AIYesNoUnknown;
    subprocessorsStatus?: AIYesNoUnknown;
    loggingSupport?: AIYesNoUnknown;
    authenticationSupport?: AIYesNoUnknown;
  };
};

const DATA_CLASS_WEIGHTS: Record<AIDataClass, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  CUSTOMER_DATA: 3,
  CUSTOMER_CONTENT: 3,
  CUSTOMER_METADATA: 2,
  PII: 3,
  PHI: 4,
  PCI: 4,
  FINANCIAL: 3,
  SOURCE_CODE: 3,
  SECRETS: 5,
  SECURITY_LOGS: 2,
  HR: 3
};

const REQUIREMENT_LABELS: Record<AIPolicyRequirement, string> = {
  HUMAN_REVIEW_REQUIRED: 'Human review is required before high-stakes output is used or shared.',
  APPROVED_VENDOR_ONLY: 'Use only vendors that have completed AI intake and approval.',
  NO_CUSTOMER_SECRETS: 'Customer secrets or private keys must not be sent to external AI services.',
  NO_REGULATED_DATA: 'Regulated data must not be processed in this workflow without explicit approval.',
  NO_INTERNET_ACCESS: 'Internet access must be disabled or tightly constrained.',
  NO_EXTERNAL_TOOL_INVOCATION: 'External tool invocation must be disabled or explicitly controlled.',
  LOGGING_REQUIRED: 'Prompt, output, and approval activity must be logged for auditability.',
  RETENTION_MUST_BE_KNOWN: 'Vendor retention behavior must be known before approval.'
};

const CONTROL_LABELS: Record<AIPolicyRequirement, string> = {
  HUMAN_REVIEW_REQUIRED: 'Add documented human approval before production use.',
  APPROVED_VENDOR_ONLY: 'Complete AI vendor intake and approval before use.',
  NO_CUSTOMER_SECRETS: 'Strip secrets and credentials from prompts and connected tools.',
  NO_REGULATED_DATA: 'Block regulated data until legal, privacy, and governance approval is recorded.',
  NO_INTERNET_ACCESS: 'Disable internet egress or route through an approved broker.',
  NO_EXTERNAL_TOOL_INVOCATION: 'Disable external tool calls or restrict them to approved low-risk actions.',
  LOGGING_REQUIRED: 'Enable logging, audit trails, and durable review history.',
  RETENTION_MUST_BE_KNOWN: 'Obtain retention terms and document them in the vendor review.'
};

const HIGH_SENSITIVITY_DATA_CLASSES = new Set<AIDataClass>(['PHI', 'PCI', 'SECRETS']);
const RESTRICTED_DATA_CLASSES = new Set<AIDataClass>([
  'CONFIDENTIAL',
  'CUSTOMER_DATA',
  'CUSTOMER_CONTENT',
  'CUSTOMER_METADATA',
  'PII',
  'FINANCIAL',
  'SOURCE_CODE',
  'SECURITY_LOGS',
  'HR'
]);

function uniq<T>(values: T[]) {
  return Array.from(new Set(values));
}

function hasYes(value: AIYesNoUnknown | undefined) {
  return value === 'YES';
}

function hasUnknown(value: AIYesNoUnknown | undefined) {
  return value === 'UNKNOWN' || value === undefined;
}

function normalizedText(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function riskTierFromScore(score: number): AIRiskTier {
  if (score >= 10) return 'CRITICAL';
  if (score >= 7) return 'HIGH';
  if (score >= 4) return 'MODERATE';
  return 'LOW';
}

function buildDataClassBuckets(args: EvaluateAIGovernancePolicyArgs) {
  const allowed: AIDataClass[] = [];
  const restricted: AIDataClass[] = [];
  const prohibited: AIDataClass[] = [];
  const highExposure =
    hasYes(args.internetAccess) || hasYes(args.externalToolAccess) || hasYes(args.vendorSignals?.trainsOnCustomerData);

  for (const dataClass of uniq(args.dataClasses)) {
    if (dataClass === 'PUBLIC') {
      allowed.push(dataClass);
      continue;
    }

    if (HIGH_SENSITIVITY_DATA_CLASSES.has(dataClass) && highExposure) {
      prohibited.push(dataClass);
      continue;
    }

    if (HIGH_SENSITIVITY_DATA_CLASSES.has(dataClass) || RESTRICTED_DATA_CLASSES.has(dataClass)) {
      restricted.push(dataClass);
      continue;
    }

    allowed.push(dataClass);
  }

  return {
    allowedDataClasses: allowed,
    restrictedDataClasses: restricted,
    prohibitedDataClasses: prohibited
  };
}

function buildRiskSignals(args: EvaluateAIGovernancePolicyArgs) {
  const primaryRisks: string[] = [];
  const notes: string[] = [];
  let score = uniq(args.dataClasses).reduce((sum, value) => sum + (DATA_CLASS_WEIGHTS[value] ?? 0), 0);

  if (hasYes(args.customerDataInvolved)) {
    score += 2;
    primaryRisks.push('Customer data is involved in the AI workflow and requires procurement-safe handling rules.');
  }

  if (hasYes(args.regulatedDataInvolved)) {
    score += 3;
    primaryRisks.push('Regulated data is in scope and requires explicit governance approval.');
  }

  if (hasYes(args.secretsInvolved)) {
    score += 4;
    primaryRisks.push('Secrets or highly sensitive internal data could leak through prompts, context, or downstream tools.');
  }

  if (hasYes(args.externalToolAccess)) {
    score += 2;
    primaryRisks.push('External tool invocation increases the blast radius of automation mistakes or prompt abuse.');
  }

  if (hasYes(args.internetAccess)) {
    score += 1;
    primaryRisks.push('Internet access creates additional exposure to untrusted content and prompt injection.');
  }

  if (args.workflowType === 'AUTOMATION' || args.workflowType === 'AGENT' || args.workflowType === 'RAG') {
    score += 2;
    primaryRisks.push('The selected workflow type can take action or propagate output without enough human intervention.');
  }

  if (args.deploymentContext === 'SAAS' || args.deploymentContext === 'API') {
    score += 1;
  }

  if (args.useCaseType === 'CUSTOMER_FACING') {
    score += 2;
  }

  if (args.vendorSignals?.retentionPolicyStatus === 'UNKNOWN') {
    score += 1;
    notes.push('Vendor retention policy is still unknown.');
  }

  if (args.vendorSignals?.loggingSupport === 'NO') {
    score += 1;
    notes.push('Vendor logging support is unavailable or insufficient.');
  }

  if (args.vendorSignals?.authenticationSupport === 'NO') {
    score += 1;
    notes.push('Vendor authentication and SSO support are weak or unknown.');
  }

  if (hasYes(args.vendorSignals?.trainsOnCustomerData)) {
    score += 3;
    primaryRisks.push('Vendor training on customer data can create durable exposure and contractual risk.');
  }

  if (hasUnknown(args.vendorSignals?.subprocessorsStatus) && hasYes(args.customerDataInvolved)) {
    score += 1;
    notes.push('Subprocessor visibility is incomplete for a customer-data workflow.');
  }

  return {
    riskTier: riskTierFromScore(score),
    primaryRisks: uniq(primaryRisks),
    notes: uniq(notes)
  };
}

function buildRequirementEvaluation(
  args: EvaluateAIGovernancePolicyArgs,
  riskTier: AIRiskTier,
  prohibitedDataClasses: AIDataClass[]
) {
  const requiredConditions = new Set<AIPolicyRequirement>(['LOGGING_REQUIRED']);
  const unmetRequirements = new Set<AIPolicyRequirement>();
  const approvalBlockers = new Set<AIPolicyRequirement>();

  const highStakeWorkflow =
    riskTier === 'HIGH' ||
    riskTier === 'CRITICAL' ||
    hasYes(args.customerDataInvolved) ||
    hasYes(args.regulatedDataInvolved) ||
    hasYes(args.secretsInvolved) ||
    args.workflowType === 'AUTOMATION' ||
    args.workflowType === 'AGENT';

  if (highStakeWorkflow) {
    requiredConditions.add('HUMAN_REVIEW_REQUIRED');
    if (!args.humanReviewRequired) {
      unmetRequirements.add('HUMAN_REVIEW_REQUIRED');
      approvalBlockers.add('HUMAN_REVIEW_REQUIRED');
    }
  }

  if (args.vendorSignals || args.workflowType === 'ASSISTANT' || args.workflowType === 'CHATBOT' || args.workflowType === 'RAG') {
    requiredConditions.add('APPROVED_VENDOR_ONLY');
    if (args.vendorSignals && !args.vendorSignals.hasApprovedVendorReview) {
      unmetRequirements.add('APPROVED_VENDOR_ONLY');
    }
  }

  if (hasYes(args.secretsInvolved)) {
    requiredConditions.add('NO_CUSTOMER_SECRETS');
    unmetRequirements.add('NO_CUSTOMER_SECRETS');
    approvalBlockers.add('NO_CUSTOMER_SECRETS');
  }

  if (hasYes(args.regulatedDataInvolved)) {
    requiredConditions.add('NO_REGULATED_DATA');
    unmetRequirements.add('NO_REGULATED_DATA');
    approvalBlockers.add('NO_REGULATED_DATA');
  }

  if (hasYes(args.internetAccess)) {
    requiredConditions.add('NO_INTERNET_ACCESS');
    unmetRequirements.add('NO_INTERNET_ACCESS');
  }

  if (hasYes(args.externalToolAccess)) {
    requiredConditions.add('NO_EXTERNAL_TOOL_INVOCATION');
    unmetRequirements.add('NO_EXTERNAL_TOOL_INVOCATION');
  }

  if (args.vendorSignals) {
    requiredConditions.add('RETENTION_MUST_BE_KNOWN');
    if (args.vendorSignals.retentionPolicyStatus !== 'KNOWN') {
      unmetRequirements.add('RETENTION_MUST_BE_KNOWN');
    }
    if (args.vendorSignals.loggingSupport !== 'YES') {
      unmetRequirements.add('LOGGING_REQUIRED');
    }
  }

  if (prohibitedDataClasses.length > 0) {
    approvalBlockers.add('NO_CUSTOMER_SECRETS');
  }

  if (
    hasYes(args.vendorSignals?.trainsOnCustomerData) &&
    (hasYes(args.customerDataInvolved) || hasYes(args.regulatedDataInvolved) || hasYes(args.secretsInvolved))
  ) {
    approvalBlockers.add('APPROVED_VENDOR_ONLY');
    approvalBlockers.add('RETENTION_MUST_BE_KNOWN');
  }

  return {
    requiredConditions: Array.from(requiredConditions),
    unmetRequirements: Array.from(unmetRequirements),
    approvalBlockers: Array.from(approvalBlockers)
  };
}

function buildDecisionConditions(
  unmetRequirements: AIPolicyRequirement[],
  restrictedDataClasses: AIDataClass[],
  approvalBlockers: AIPolicyRequirement[]
) {
  const decisionConditions = uniq([
    ...unmetRequirements.map((requirement) => REQUIREMENT_LABELS[requirement]),
    ...(restrictedDataClasses.length > 0
      ? [`Restricted data classes are in scope: ${restrictedDataClasses.join(', ')}. Document compensating controls before approval.`]
      : []),
    ...(approvalBlockers.length > 0 ? ['Approval blockers remain open and must be resolved before production use.'] : [])
  ]);

  const requiredControls = uniq(unmetRequirements.map((requirement) => CONTROL_LABELS[requirement]));

  return {
    decisionConditions,
    requiredControls
  };
}

async function getMatchedPolicies(args: EvaluateAIGovernancePolicyArgs, requirements: AIPolicyRequirement[]) {
  const catalog = await getPolicyCatalog();
  const keywords = uniq(
    [
      'ai',
      'acceptable use',
      'security',
      'vendor',
      'third party',
      'data',
      'classification',
      'access',
      'logging',
      'monitoring',
      'privacy',
      'retention',
      ...args.dataClasses.map((value) => value.replace(/_/g, ' ').toLowerCase()),
      ...requirements.map((value) => value.replace(/_/g, ' ').toLowerCase())
    ].filter(Boolean)
  );

  return catalog.policies
    .filter((policy) => {
      const haystack = normalizedText([
        policy.title,
        policy.category,
        policy.type,
        ...policy.tags,
        ...policy.frameworks
      ]);
      return keywords.some((keyword) => haystack.includes(keyword));
    })
    .slice(0, 8)
    .map((policy) => policy.id);
}

export async function evaluateAIGovernancePolicy(
  args: EvaluateAIGovernancePolicyArgs
): Promise<EvaluatedAIGovernancePolicy> {
  const buckets = buildDataClassBuckets(args);
  const riskSignals = buildRiskSignals(args);
  const requirements = buildRequirementEvaluation(args, riskSignals.riskTier, buckets.prohibitedDataClasses);
  const matchedPolicyIds = await getMatchedPolicies(args, requirements.requiredConditions);
  const { decisionConditions, requiredControls } = buildDecisionConditions(
    requirements.unmetRequirements,
    buckets.restrictedDataClasses,
    requirements.approvalBlockers
  );

  const recommendedDecision: AIPolicyDecision =
    requirements.approvalBlockers.length > 0
      ? 'REJECTED'
      : requirements.unmetRequirements.length > 0 ||
          buckets.restrictedDataClasses.length > 0 ||
          riskSignals.riskTier === 'HIGH' ||
          riskSignals.riskTier === 'CRITICAL'
        ? 'APPROVED_WITH_CONDITIONS'
        : 'APPROVED';

  return {
    riskTier: riskSignals.riskTier,
    humanReviewRequired: args.humanReviewRequired || requirements.requiredConditions.includes('HUMAN_REVIEW_REQUIRED'),
    allowedDataClasses: buckets.allowedDataClasses,
    restrictedDataClasses: buckets.restrictedDataClasses,
    prohibitedDataClasses: buckets.prohibitedDataClasses,
    matchedPolicyIds: uniq([...(args.linkedPolicyIds ?? []), ...matchedPolicyIds]),
    requiredConditions: requirements.requiredConditions,
    unmetRequirements: requirements.unmetRequirements,
    approvalBlockers: requirements.approvalBlockers,
    decisionConditions,
    primaryRisks: riskSignals.primaryRisks,
    requiredControls,
    recommendedDecision,
    notes: riskSignals.notes
  };
}
