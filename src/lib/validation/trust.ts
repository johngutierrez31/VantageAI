import { z } from 'zod';

export const trustInboxCreateSchema = z.object({
  title: z.string().min(3).max(200),
  requesterEmail: z.string().email().optional(),
  questionnaireUploadId: z.string().min(1).optional(),
  notes: z.string().max(2000).optional()
});

export const trustInboxUpdateSchema = z.object({
  status: z.enum(['NEW', 'IN_REVIEW', 'DRAFT_READY', 'DELIVERED']).optional(),
  notes: z.string().max(2000).optional(),
  attachmentEvidenceIds: z.array(z.string().min(1)).max(100).optional()
});

export const trustDocCreateSchema = z.object({
  category: z.string().min(2).max(100),
  evidenceId: z.string().min(1),
  tags: z.array(z.string().min(1)).max(20).optional()
});

export const trustPacketCreateSchema = z.object({
  name: z.string().min(3).max(200),
  shareMode: z.enum(['INTERNAL_REVIEW', 'EXTERNAL_SHARE']).default('INTERNAL_REVIEW'),
  trustInboxItemId: z.string().min(1).optional(),
  questionnaireUploadId: z.string().min(1).optional(),
  approvedContactName: z.string().min(2).max(120).optional(),
  approvedContactEmail: z.string().email().optional()
});

export const evidenceMapUpdateSchema = z.object({
  status: z.enum(['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'ARCHIVED']).optional(),
  assignedReviewerUserId: z.string().min(1).nullable().optional(),
  reviewDueAt: z.string().datetime().nullable().optional(),
  reviewerNotes: z.string().max(4000).nullable().optional()
});

export const trustPacketUpdateSchema = z.object({
  status: z.enum(['DRAFT', 'READY_FOR_REVIEW', 'READY_TO_SHARE', 'SHARED']).optional(),
  assignedReviewerUserId: z.string().min(1).nullable().optional(),
  reviewDueAt: z.string().datetime().nullable().optional(),
  reviewerNotes: z.string().max(4000).nullable().optional(),
  approvedContactName: z.string().min(2).max(120).nullable().optional(),
  approvedContactEmail: z.string().email().nullable().optional()
});

export const answerLibraryUpdateSchema = z.object({
  questionText: z.string().min(3).max(4000).optional(),
  answerText: z.string().min(3).max(12000).optional(),
  scope: z.enum(['REUSABLE', 'TENANT_SPECIFIC']).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  ownerUserId: z.string().min(1).nullable().optional()
});
