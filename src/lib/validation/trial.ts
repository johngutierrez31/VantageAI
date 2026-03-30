import { z } from 'zod';
import { passwordSchema } from '@/lib/validation/auth';

export const trialStartSchema = z.object({
  workspaceName: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional()
});
