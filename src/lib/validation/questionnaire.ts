import { z } from 'zod';

export const questionnaireImportSchema = z.object({
  format: z.enum(['csv', 'json']),
  content: z.string().min(5)
});

export const questionnaireCommitSchema = z.object({
  importId: z.string().min(1),
  overrides: z
    .array(
      z.object({
        rowId: z.string().min(1),
        mappedQuestionId: z.string().min(1).nullable(),
        score: z.number().min(0).max(4).optional(),
        confidence: z.number().min(0).max(1).optional()
      })
    )
    .optional()
});

export const questionnaireMapSchema = z.object({
  templateId: z.string().min(1).optional(),
  assessmentId: z.string().min(1).optional()
});

export const questionnaireDraftSchema = z.object({
  itemIds: z.array(z.string().min(1)).max(500).optional(),
  maxItems: z.number().int().min(1).max(500).optional()
});
