import { z } from 'zod';

const copilotHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000)
});

export const copilotRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(copilotHistoryItemSchema).max(12).optional()
});
