import { z } from 'zod';

export const questionSchema = z.object({
  prompt: z.string().min(3),
  rubric: z.string().min(3),
  weight: z.number().positive().default(1)
});

export const controlSchema = z.object({
  domain: z.string().min(2),
  code: z.string().min(2),
  title: z.string().min(3),
  weight: z.number().positive().default(1),
  questions: z.array(questionSchema).min(1)
});

export const templateCreateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  versionTitle: z.string().min(3),
  controls: z.array(controlSchema).min(1)
});

export const templateVersionCreateSchema = z.object({
  title: z.string().min(3),
  notes: z.string().optional(),
  controls: z.array(controlSchema).min(1)
});
