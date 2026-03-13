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

export const trustRoomCreateSchema = z.object({
  trustPacketId: z.string().min(1),
  name: z.string().min(3).max(200),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/),
  accessMode: z.enum(['INTERNAL_REVIEW', 'PROTECTED_LINK', 'REQUEST_ACCESS']).default('INTERNAL_REVIEW'),
  roomSections: z.array(z.string().min(1)).min(1).max(10),
  summaryText: z.string().max(2000).optional(),
  termsRequired: z.boolean().default(true),
  ndaRequired: z.boolean().default(false),
  shareExpiresAt: z.string().datetime().nullable().optional(),
  rotateShareKey: z.boolean().optional()
});

export const trustRoomUpdateSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  accessMode: z.enum(['INTERNAL_REVIEW', 'PROTECTED_LINK', 'REQUEST_ACCESS']).optional(),
  roomSections: z.array(z.string().min(1)).min(1).max(10).optional(),
  summaryText: z.string().max(2000).nullable().optional(),
  termsRequired: z.boolean().optional(),
  ndaRequired: z.boolean().optional(),
  shareExpiresAt: z.string().datetime().nullable().optional(),
  rotateShareKey: z.boolean().optional()
});

export const trustRoomAccessRequestCreateSchema = z.object({
  requesterName: z.string().min(2).max(120),
  requesterEmail: z.string().email(),
  companyName: z.string().min(2).max(160).optional(),
  requestReason: z.string().min(6).max(2000).optional(),
  acknowledgedTerms: z.boolean().refine((value) => value === true, {
    message: 'Terms acknowledgement is required'
  })
});

export const trustRoomAccessRequestUpdateSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'FULFILLED']).optional(),
  assignedOwnerUserId: z.string().min(1).nullable().optional(),
  internalNotes: z.string().max(4000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  rotateGrantToken: z.boolean().optional()
});

export const trustRoomEngagementEventSchema = z.object({
  eventType: z.enum(['ROOM_VIEWED', 'SECTION_VIEWED', 'PACKET_DOWNLOADED', 'REQUEST_SUBMITTED', 'ACCESS_GRANTED']),
  sectionKey: z.string().min(1).max(120).optional(),
  actorEmail: z.string().email().optional(),
  actorLabel: z.string().min(1).max(160).optional()
});

export const answerLibraryUpdateSchema = z.object({
  questionText: z.string().min(3).max(4000).optional(),
  answerText: z.string().min(3).max(12000).optional(),
  scope: z.enum(['REUSABLE', 'TENANT_SPECIFIC']).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  ownerUserId: z.string().min(1).nullable().optional()
});
