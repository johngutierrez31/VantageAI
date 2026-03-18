import { z } from 'zod';

export const trialStartSchema = z.object({
  workspaceName: z.string().min(2).max(100),
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional()
});
