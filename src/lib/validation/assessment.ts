import { z } from 'zod';

export const assessmentCreateSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(3),
  customerName: z.string().min(2)
});

export const responseUpsertSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().optional(),
  score: z.number().min(0).max(4),
  confidence: z.number().min(0).max(1).optional(),
  rationale: z.string().optional()
});

export const responsesPatchSchema = z.object({
  responses: z.array(responseUpsertSchema).min(1).max(500)
});
