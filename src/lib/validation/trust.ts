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
