import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200, 'Password is too long');

export const credentialsLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const accountPasswordUpdateSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: passwordSchema
});
