import { z } from 'zod';

export const pulseSnapshotCreateSchema = z.object({
  periodType: z.enum(['MONTHLY', 'QUARTERLY']).default('QUARTERLY'),
  snapshotDate: z.string().datetime().optional(),
  name: z.string().min(3).max(120).optional()
});

export const pulseSnapshotUpdateSchema = z.object({
  status: z.enum(['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'PUBLISHED']).optional(),
  reviewerNotes: z.string().max(4000).optional()
});

export const riskRegisterSyncSchema = z.object({
  includeManual: z.boolean().optional().default(false)
});

export const riskRegisterCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(4000),
  businessImpactSummary: z.string().min(5).max(2000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  likelihood: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED', 'CLOSED']).optional(),
  ownerUserId: z.string().min(1).nullable().optional(),
  targetDueAt: z.string().datetime().nullable().optional(),
  linkedControlIds: z.array(z.string().min(1)).optional(),
  linkedFindingIds: z.array(z.string().min(1)).optional(),
  linkedTaskIds: z.array(z.string().min(1)).optional(),
  linkedQuestionnaireIds: z.array(z.string().min(1)).optional(),
  linkedEvidenceMapIds: z.array(z.string().min(1)).optional(),
  linkedTrustPacketIds: z.array(z.string().min(1)).optional(),
  linkedAssessmentIds: z.array(z.string().min(1)).optional(),
  reviewNotes: z.string().max(4000).optional()
});

export const riskRegisterUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(5).max(4000).optional(),
  businessImpactSummary: z.string().min(5).max(2000).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  likelihood: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED', 'CLOSED']).optional(),
  ownerUserId: z.string().min(1).nullable().optional(),
  targetDueAt: z.string().datetime().nullable().optional(),
  reviewNotes: z.string().max(4000).optional()
});

export const roadmapGenerateSchema = z.object({
  snapshotId: z.string().min(1),
  name: z.string().min(3).max(120).optional()
});

export const roadmapUpdateSchema = z.object({
  status: z.enum(['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'ARCHIVED']).optional(),
  reviewerNotes: z.string().max(4000).optional()
});

export const roadmapItemUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  ownerUserId: z.string().min(1).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  rationale: z.string().min(5).max(4000).optional(),
  expectedImpact: z.string().min(5).max(2000).optional()
});

export const boardBriefGenerateSchema = z.object({
  snapshotId: z.string().min(1),
  roadmapId: z.string().min(1).optional(),
  title: z.string().min(3).max(160).optional()
});

export const boardBriefUpdateSchema = z.object({
  status: z.enum(['DRAFT', 'NEEDS_REVIEW', 'APPROVED']).optional(),
  reviewerNotes: z.string().max(4000).optional()
});

export const quarterlyReviewCreateSchema = z.object({
  snapshotId: z.string().min(1),
  roadmapId: z.string().min(1),
  boardBriefId: z.string().min(1),
  reviewDate: z.string().datetime().optional()
});

export const quarterlyReviewUpdateSchema = z.object({
  attendeeNames: z.array(z.string().min(1)).optional(),
  notes: z.string().max(8000).nullable().optional(),
  decisionsMade: z.array(z.string().min(1)).optional(),
  followUpActions: z.array(z.string().min(1)).optional(),
  status: z.enum(['DRAFT', 'FINALIZED']).optional()
});
