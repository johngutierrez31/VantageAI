import { z } from 'zod';

const copilotHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000)
});

const copilotModeSchema = z.enum([
  'general',
  'incident_response',
  'threat_modeling',
  'compliance',
  'architecture'
]);

export const copilotRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(copilotHistoryItemSchema).max(12).optional(),
  mode: copilotModeSchema.optional()
});

export type CopilotMode = z.infer<typeof copilotModeSchema>;
