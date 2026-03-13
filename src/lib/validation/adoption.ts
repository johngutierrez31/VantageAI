import { z } from 'zod';

export const adoptionImportTargetSchema = z.enum([
  'FINDINGS',
  'RISKS',
  'APPROVED_ANSWERS',
  'INCIDENTS'
]);

export const adoptionImportSourceSchema = z.enum(['MANUAL', 'CSV', 'CONNECTOR_EXPORT']);

export const adoptionImportSchema = z
  .object({
    target: adoptionImportTargetSchema,
    source: adoptionImportSourceSchema,
    content: z.string().min(3).max(20000),
    sourceLabel: z.string().min(2).max(120).optional(),
    connectorId: z.string().min(1).optional(),
    ownerUserId: z.string().min(1).optional(),
    approvedAnswerScope: z.enum(['REUSABLE', 'TENANT_SPECIFIC']).optional(),
    incidentType: z
      .enum([
        'IDENTITY_COMPROMISE',
        'RANSOMWARE',
        'PHISHING',
        'THIRD_PARTY_BREACH',
        'CLOUD_EXPOSURE',
        'LOST_DEVICE',
        'AI_MISUSE',
        'OTHER'
      ])
      .optional(),
    incidentSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
  })
  .superRefine((payload, ctx) => {
    if (payload.source === 'CONNECTOR_EXPORT' && !payload.connectorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['connectorId'],
        message: 'Connector-assisted imports require a configured connector'
      });
    }
  });
