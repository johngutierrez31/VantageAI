import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

type Payload = {
  tenantId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(payload: Payload) {
  const metadata = (payload.metadata ?? {}) as Prisma.InputJsonValue;

  await prisma.auditLog.create({
    data: {
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      action: payload.action,
      metadata
    }
  });
}
