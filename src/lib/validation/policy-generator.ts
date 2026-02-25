import { z } from 'zod';

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const formatSchema = z.enum(['markdown', 'html', 'json']);

const reviewScheduleSchema = z.enum(['Quarterly', 'Semi-annually', 'Annually', 'Bi-annually']);

export const policyGenerationRequestSchema = z.object({
  policyIds: z.array(z.string().min(1)).min(1).max(20),
  formats: z.array(formatSchema).min(1).max(3),
  organization: z.object({
    companyName: z.string().min(2).max(160),
    industry: z.string().min(2).max(120),
    organizationSize: z.string().min(1).max(120),
    responsibleOfficer: z.string().min(2).max(160),
    responsibleDepartment: z.string().min(2).max(160),
    contactEmail: z.string().email(),
    effectiveDate: z.string().regex(isoDateRegex, 'effectiveDate must be YYYY-MM-DD'),
    reviewSchedule: reviewScheduleSchema,
    version: z.string().min(1).max(32).default('1.0'),
    frameworks: z.array(z.string().min(1).max(80)).max(12).default([]),
    regulations: z.array(z.string().min(1).max(80)).max(12).default([])
  }),
  notes: z.string().max(2000).optional()
});
