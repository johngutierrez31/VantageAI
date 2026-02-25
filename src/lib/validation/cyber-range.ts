import { z } from 'zod';

const environmentSchema = z.enum(['on_premise', 'cloud', 'hybrid']);
const scaleSchema = z.enum(['small', 'medium', 'large']);
const fidelitySchema = z.enum(['medium', 'high', 'ultra']);

export const cyberRangeGenerationRequestSchema = z.object({
  rangeName: z.string().min(3).max(120),
  organizationName: z.string().min(2).max(120),
  primaryUseCase: z.string().min(12).max(300),
  environment: environmentSchema,
  scale: scaleSchema,
  fidelity: fidelitySchema,
  durationDays: z.coerce.number().int().min(1).max(14),
  participants: z.coerce.number().int().min(2).max(1000),
  includeIdentityZone: z.boolean().default(true),
  includeOtZone: z.boolean().default(false),
  includeNpcTraffic: z.boolean().default(true),
  complianceTags: z.array(z.string().min(2).max(40)).max(8).default([])
});

export type CyberRangeGenerationRequest = z.infer<typeof cyberRangeGenerationRequestSchema>;
