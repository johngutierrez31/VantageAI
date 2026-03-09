import { z } from 'zod';

const incidentStatusEnum = z.enum([
  'NEW',
  'TRIAGE',
  'ACTIVE',
  'CONTAINED',
  'RECOVERING',
  'RESOLVED',
  'POST_INCIDENT_REVIEW',
  'ARCHIVED'
]);

const incidentSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const incidentTypeEnum = z.enum([
  'IDENTITY_COMPROMISE',
  'RANSOMWARE',
  'PHISHING',
  'THIRD_PARTY_BREACH',
  'CLOUD_EXPOSURE',
  'LOST_DEVICE',
  'AI_MISUSE',
  'OTHER'
]);
const responseOpsPhaseEnum = z.enum([
  'TRIAGE',
  'EVIDENCE_COLLECTION',
  'CONTAINMENT',
  'ERADICATION',
  'RECOVERY',
  'COMMUNICATIONS',
  'POST_INCIDENT_REVIEW'
]);
const incidentTimelineEventTypeEnum = z.enum([
  'CREATED',
  'TRIAGE_STARTED',
  'STATUS_CHANGED',
  'RUNBOOK_LAUNCHED',
  'COMMUNICATION_SENT',
  'CONTAINMENT_COMPLETED',
  'DECISION_LOG',
  'NOTE',
  'AFTER_ACTION_GENERATED',
  'TABLETOP_LINKED'
]);
const afterActionReportStatusEnum = z.enum(['DRAFT', 'NEEDS_REVIEW', 'APPROVED']);
const tabletopExerciseStatusEnum = z.enum(['DRAFT', 'COMPLETED', 'ARCHIVED']);

const stringList = (maxItems: number, maxLength = 240) =>
  z.array(z.string().min(1).max(maxLength)).max(maxItems).optional();

export const incidentCreateSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  description: z.string().min(10).max(5000).optional(),
  incidentType: incidentTypeEnum,
  severity: incidentSeverityEnum.optional(),
  detectionSource: z.string().min(2).max(200).nullable().optional(),
  reportedBy: z.string().min(2).max(160).nullable().optional(),
  incidentOwnerUserId: z.string().min(1).nullable().optional(),
  communicationsOwnerUserId: z.string().min(1).nullable().optional(),
  affectedSystems: stringList(20, 160),
  affectedServices: stringList(20, 160),
  affectedVendorNames: stringList(20, 160),
  aiUseCaseId: z.string().min(1).nullable().optional(),
  aiVendorReviewId: z.string().min(1).nullable().optional(),
  questionnaireUploadId: z.string().min(1).nullable().optional(),
  trustInboxItemId: z.string().min(1).nullable().optional(),
  startedAt: z.string().datetime().optional(),
  nextUpdateDueAt: z.string().datetime().nullable().optional(),
  executiveSummary: z.string().max(4000).nullable().optional(),
  internalNotes: z.string().max(8000).nullable().optional(),
  guidedStart: z.boolean().default(true),
  launchRunbookPack: z.boolean().default(true),
  runbookId: z.string().min(1).nullable().optional(),
  assignee: z.string().min(1).nullable().optional()
});

export const incidentUpdateSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  description: z.string().min(10).max(5000).optional(),
  severity: incidentSeverityEnum.optional(),
  status: incidentStatusEnum.optional(),
  detectionSource: z.string().min(2).max(200).nullable().optional(),
  reportedBy: z.string().min(2).max(160).nullable().optional(),
  incidentOwnerUserId: z.string().min(1).nullable().optional(),
  communicationsOwnerUserId: z.string().min(1).nullable().optional(),
  affectedSystems: stringList(20, 160),
  affectedServices: stringList(20, 160),
  affectedVendorNames: stringList(20, 160),
  nextUpdateDueAt: z.string().datetime().nullable().optional(),
  declaredAt: z.string().datetime().nullable().optional(),
  containedAt: z.string().datetime().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  executiveSummary: z.string().max(4000).nullable().optional(),
  internalNotes: z.string().max(8000).nullable().optional(),
  linkedBoardBriefIds: z.array(z.string().min(1)).max(20).optional(),
  linkedQuarterlyReviewIds: z.array(z.string().min(1)).max(20).optional()
});

export const incidentTimelineEventCreateSchema = z.object({
  eventType: incidentTimelineEventTypeEnum.default('NOTE'),
  title: z.string().min(3).max(200),
  detail: z.string().max(4000).nullable().optional(),
  isShareable: z.boolean().default(false)
});

export const incidentRunbookPackCreateSchema = z.object({
  runbookId: z.string().min(1).nullable().optional(),
  assignee: z.string().min(1).nullable().optional()
});

export const afterActionGenerateSchema = z.object({
  title: z.string().min(3).max(160).optional()
});

export const afterActionUpdateSchema = z.object({
  status: afterActionReportStatusEnum.optional(),
  reviewerNotes: z.string().max(4000).nullable().optional()
});

export const tabletopCreateSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  scenarioType: incidentTypeEnum,
  exerciseDate: z.string().datetime().optional(),
  participantNames: stringList(20, 120),
  participantRoles: stringList(20, 120),
  exerciseNotes: z.string().max(5000).nullable().optional()
});

export const tabletopUpdateSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  status: tabletopExerciseStatusEnum.optional(),
  exerciseDate: z.string().datetime().optional(),
  participantNames: stringList(20, 120),
  participantRoles: stringList(20, 120),
  exerciseNotes: z.string().max(5000).nullable().optional(),
  decisionsMade: stringList(20, 300),
  gapsIdentified: stringList(20, 400),
  followUpActions: stringList(20, 400),
  reviewerNotes: z.string().max(4000).nullable().optional()
});

export const responseOpsTaskUpdateSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  assignee: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  responseOpsPhase: responseOpsPhaseEnum.optional()
});
