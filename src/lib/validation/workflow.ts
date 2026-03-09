import { z } from 'zod';

export const taskCreateSchema = z.object({
  assessmentId: z.string().min(1).optional(),
  title: z.string().min(3),
  controlCode: z.string().min(1).optional(),
  description: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
});

export const taskUpdateSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  assignee: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
});

export const findingUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED']).optional(),
  ownerUserId: z.string().min(1).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
});

export const exceptionCreateSchema = z.object({
  assessmentId: z.string().min(1),
  controlCode: z.string().min(1),
  reason: z.string().min(5),
  owner: z.string().optional(),
  approver: z.string().min(1),
  dueDate: z.string().datetime()
});

export const exceptionUpdateSchema = z.object({
  status: z.enum(['OPEN', 'ACCEPTED', 'CLOSED']).optional(),
  reason: z.string().min(5).optional(),
  owner: z.string().optional(),
  approver: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional()
});

export const evidenceRequestCreateSchema = z.object({
  assessmentId: z.string().min(1).optional(),
  title: z.string().min(3),
  details: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: z.string().datetime().optional()
});

export const evidenceRequestUpdateSchema = z.object({
  status: z.enum(['REQUESTED', 'RECEIVED', 'COMPLETE']).optional(),
  assignee: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  details: z.string().optional()
});
