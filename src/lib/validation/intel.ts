import { z } from 'zod';

export const missionTaskSeedSchema = z.object({
  missionIds: z.array(z.string().min(1)).min(1).max(7).optional(),
  assignee: z.string().min(1).max(160).optional()
});

export const runbookTaskSeedSchema = z.object({
  runbookId: z.string().min(1),
  assignee: z.string().min(1).max(160).optional()
});

