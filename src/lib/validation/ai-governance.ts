import { z } from 'zod';

const aiGovernanceStatusEnum = z.enum([
  'DRAFT',
  'NEEDS_REVIEW',
  'APPROVED',
  'APPROVED_WITH_CONDITIONS',
  'REJECTED',
  'ARCHIVED'
]);

const aiUseCaseTypeEnum = z.enum([
  'INTERNAL_PRODUCTIVITY',
  'CUSTOMER_FACING',
  'SECURITY_WORKFLOW',
  'ENGINEERING_WORKFLOW',
  'CONTENT_WORKFLOW',
  'ANALYTICS_WORKFLOW',
  'OTHER'
]);

const aiWorkflowTypeEnum = z.enum([
  'ASSISTANT',
  'CHATBOT',
  'AUTOMATION',
  'AGENT',
  'RAG',
  'ANALYTICS',
  'CONTENT_GENERATION',
  'OTHER'
]);

const aiDeploymentContextEnum = z.enum(['SAAS', 'INTERNAL', 'HYBRID', 'API', 'LOCAL_MODEL', 'OTHER']);
const aiRiskTierEnum = z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']);
const aiYesNoUnknownEnum = z.enum(['YES', 'NO', 'UNKNOWN']);
const aiRetentionStatusEnum = z.enum(['KNOWN', 'UNKNOWN', 'NO_RETENTION']);
const aiDpaStatusEnum = z.enum(['NOT_STARTED', 'REQUESTED', 'RECEIVED', 'SIGNED', 'NOT_REQUIRED']);
const aiDataClassEnum = z.enum([
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'CUSTOMER_DATA',
  'CUSTOMER_CONTENT',
  'CUSTOMER_METADATA',
  'PII',
  'PHI',
  'PCI',
  'FINANCIAL',
  'SOURCE_CODE',
  'SECRETS',
  'SECURITY_LOGS',
  'HR'
]);
const aiPolicyRequirementEnum = z.enum([
  'HUMAN_REVIEW_REQUIRED',
  'APPROVED_VENDOR_ONLY',
  'NO_CUSTOMER_SECRETS',
  'NO_REGULATED_DATA',
  'NO_INTERNET_ACCESS',
  'NO_EXTERNAL_TOOL_INVOCATION',
  'LOGGING_REQUIRED',
  'RETENTION_MUST_BE_KNOWN'
]);

const stringArray = (max: number) => z.array(z.string().min(1).max(4000)).max(max).optional();

export const aiUseCaseCreateSchema = z.object({
  name: z.string().min(3).max(160),
  description: z.string().min(10).max(5000),
  businessOwner: z.string().min(2).max(120),
  department: z.string().min(2).max(120).optional(),
  useCaseType: aiUseCaseTypeEnum,
  workflowType: aiWorkflowTypeEnum,
  vendorName: z.string().min(2).max(160).optional(),
  vendorReviewId: z.string().min(1).optional(),
  modelFamily: z.string().min(2).max(160).optional(),
  deploymentContext: aiDeploymentContextEnum,
  dataClasses: z.array(aiDataClassEnum).min(1).max(14),
  customerDataInvolved: aiYesNoUnknownEnum.default('UNKNOWN'),
  regulatedDataInvolved: aiYesNoUnknownEnum.default('UNKNOWN'),
  secretsInvolved: aiYesNoUnknownEnum.default('UNKNOWN'),
  externalToolAccess: aiYesNoUnknownEnum.default('UNKNOWN'),
  internetAccess: aiYesNoUnknownEnum.default('UNKNOWN'),
  humanReviewRequired: z.boolean().default(true),
  linkedPolicyIds: z.array(z.string().min(1)).max(50).optional(),
  evidenceArtifactIds: z.array(z.string().min(1)).max(100).optional(),
  assignedReviewerUserId: z.string().min(1).nullable().optional(),
  reviewDueAt: z.string().datetime().nullable().optional()
});

export const aiUseCaseUpdateSchema = z.object({
  name: z.string().min(3).max(160).optional(),
  description: z.string().min(10).max(5000).optional(),
  businessOwner: z.string().min(2).max(120).optional(),
  department: z.string().min(2).max(120).nullable().optional(),
  useCaseType: aiUseCaseTypeEnum.optional(),
  workflowType: aiWorkflowTypeEnum.optional(),
  vendorName: z.string().min(2).max(160).nullable().optional(),
  vendorReviewId: z.string().min(1).nullable().optional(),
  modelFamily: z.string().min(2).max(160).nullable().optional(),
  deploymentContext: aiDeploymentContextEnum.optional(),
  dataClasses: z.array(aiDataClassEnum).min(1).max(14).optional(),
  customerDataInvolved: aiYesNoUnknownEnum.optional(),
  regulatedDataInvolved: aiYesNoUnknownEnum.optional(),
  secretsInvolved: aiYesNoUnknownEnum.optional(),
  externalToolAccess: aiYesNoUnknownEnum.optional(),
  internetAccess: aiYesNoUnknownEnum.optional(),
  humanReviewRequired: z.boolean().optional(),
  linkedPolicyIds: z.array(z.string().min(1)).max(50).optional(),
  evidenceArtifactIds: z.array(z.string().min(1)).max(100).optional(),
  assignedReviewerUserId: z.string().min(1).nullable().optional(),
  reviewDueAt: z.string().datetime().nullable().optional(),
  reviewerNotes: z.string().max(4000).nullable().optional(),
  status: aiGovernanceStatusEnum.optional(),
  decisionConditions: stringArray(20),
  requiredConditions: z.array(aiPolicyRequirementEnum).max(20).optional()
});

export const aiVendorReviewCreateSchema = z.object({
  vendorName: z.string().min(2).max(160),
  productName: z.string().min(2).max(160),
  primaryUseCase: z.string().min(5).max(2000),
  modelProvider: z.string().min(2).max(160).optional(),
  deploymentType: aiDeploymentContextEnum,
  authenticationSupport: aiYesNoUnknownEnum.default('UNKNOWN'),
  loggingSupport: aiYesNoUnknownEnum.default('UNKNOWN'),
  retentionPolicyStatus: aiRetentionStatusEnum.default('UNKNOWN'),
  trainsOnCustomerData: aiYesNoUnknownEnum.default('UNKNOWN'),
  subprocessorsStatus: aiYesNoUnknownEnum.default('UNKNOWN'),
  dpaStatus: aiDpaStatusEnum.default('NOT_STARTED'),
  securityDocsRequested: z.boolean().default(false),
  securityDocsReceived: z.boolean().default(false),
  dataClasses: z.array(aiDataClassEnum).min(1).max(14),
  riskNotes: z.string().max(5000).optional(),
  ownerUserId: z.string().min(1).nullable().optional(),
  assignedReviewerUserId: z.string().min(1).nullable().optional(),
  reviewDueAt: z.string().datetime().nullable().optional(),
  linkedPolicyIds: z.array(z.string().min(1)).max(50).optional(),
  evidenceArtifactIds: z.array(z.string().min(1)).max(100).optional()
});

export const aiVendorReviewUpdateSchema = z.object({
  vendorName: z.string().min(2).max(160).optional(),
  productName: z.string().min(2).max(160).optional(),
  primaryUseCase: z.string().min(5).max(2000).optional(),
  modelProvider: z.string().min(2).max(160).nullable().optional(),
  deploymentType: aiDeploymentContextEnum.optional(),
  authenticationSupport: aiYesNoUnknownEnum.optional(),
  loggingSupport: aiYesNoUnknownEnum.optional(),
  retentionPolicyStatus: aiRetentionStatusEnum.optional(),
  trainsOnCustomerData: aiYesNoUnknownEnum.optional(),
  subprocessorsStatus: aiYesNoUnknownEnum.optional(),
  dpaStatus: aiDpaStatusEnum.optional(),
  securityDocsRequested: z.boolean().optional(),
  securityDocsReceived: z.boolean().optional(),
  dataClasses: z.array(aiDataClassEnum).min(1).max(14).optional(),
  riskNotes: z.string().max(5000).nullable().optional(),
  ownerUserId: z.string().min(1).nullable().optional(),
  assignedReviewerUserId: z.string().min(1).nullable().optional(),
  reviewDueAt: z.string().datetime().nullable().optional(),
  linkedPolicyIds: z.array(z.string().min(1)).max(50).optional(),
  evidenceArtifactIds: z.array(z.string().min(1)).max(100).optional(),
  reviewerNotes: z.string().max(4000).nullable().optional(),
  status: aiGovernanceStatusEnum.optional(),
  decisionConditions: stringArray(20),
  requiredConditions: z.array(aiPolicyRequirementEnum).max(20).optional()
});

export const aiReviewQueueUpdateSchema = z.object({
  assignedReviewerUserId: z.string().min(1).nullable().optional(),
  reviewDueAt: z.string().datetime().nullable().optional(),
  reviewerNotes: z.string().max(4000).nullable().optional(),
  status: aiGovernanceStatusEnum.optional()
});

export const aiSummaryRequestSchema = z.object({
  reportingPeriod: z.string().min(3).max(80).optional()
});
