import { z } from 'zod';

export const evidenceCreateSchema = z.object({
  name: z.string().min(2),
  content: z.string().min(20),
  mimeType: z.string().optional(),
  tags: z.array(z.string().min(1)).max(20).optional(),
  sourceUri: z.string().url().optional()
});

export const evidenceUploadSchema = z.object({
  tags: z.array(z.string().min(1)).max(20).optional(),
  sourceUri: z.string().url().optional()
});

export const evidenceSearchSchema = z.object({
  query: z.string().min(2),
  limit: z.number().int().min(1).max(25).optional()
});

export const evidenceLinkSchema = z
  .object({
    evidenceId: z.string().min(1),
    questionId: z.string().min(1).optional(),
    responseId: z.string().min(1).optional()
  })
  .refine((value) => Boolean(value.questionId || value.responseId), {
    message: 'Either questionId or responseId is required'
  });

export const ragGenerateSchema = z.object({
  questionId: z.string().min(1)
});
