import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { decryptConnectorSecret, encryptConnectorSecret } from '@/lib/integrations/crypto';

type SecretPayload = Record<string, string | null | undefined>;

export type ConnectorRecord = Awaited<ReturnType<typeof getConnectorConfigById>>;

function parseSecretPayload(ciphertext: string | null | undefined) {
  const decrypted = decryptConnectorSecret(ciphertext);
  if (!decrypted) return {};

  try {
    const parsed = JSON.parse(decrypted) as SecretPayload;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function serializeSecretPayload(value: SecretPayload) {
  const normalizedEntries = Object.entries(value).filter(([, fieldValue]) => typeof fieldValue === 'string' && fieldValue.trim());
  if (!normalizedEntries.length) return null;
  return encryptConnectorSecret(JSON.stringify(Object.fromEntries(normalizedEntries)));
}

export function toPrismaJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export function sanitizeConnectorConfig<
  T extends {
    id: string;
    provider: string;
    name: string;
    description: string | null;
    mode: string;
    status: string;
    configJson: Prisma.JsonValue;
    lastHealthStatus: string | null;
    lastHealthCheckedAt: Date | null;
    lastSuccessAt: Date | null;
    lastErrorAt: Date | null;
    lastErrorMessage: string | null;
    updatedAt: Date;
    createdAt: Date;
    activities?: Array<{
      id: string;
      action: string;
      status: string;
      summary: string;
      targetLabel: string | null;
      externalObjectKey: string | null;
      externalObjectUrl: string | null;
      createdAt: Date;
      errorMessage: string | null;
    }>;
    objectLinks?: Array<{
      id: string;
      entityType: string;
      entityId: string;
      externalObjectId: string;
      externalObjectKey: string | null;
      externalObjectUrl: string | null;
      lastSyncStatus: string;
      lastSyncedAt: Date | null;
    }>;
    secretCiphertext?: string | null;
  }
>(connector: T) {
  const secrets = parseSecretPayload(connector.secretCiphertext);
  return {
    ...connector,
    configJson: connector.configJson,
    secretCiphertext: undefined,
    hasSecrets: Object.keys(secrets).length > 0,
    secretFields: Object.keys(secrets),
    activities: connector.activities?.map((activity) => ({
      ...activity,
      createdAt: activity.createdAt.toISOString()
    })),
    objectLinks: connector.objectLinks?.map((link) => ({
      ...link,
      lastSyncedAt: link.lastSyncedAt?.toISOString() ?? null
    })),
    lastHealthCheckedAt: connector.lastHealthCheckedAt?.toISOString() ?? null,
    lastSuccessAt: connector.lastSuccessAt?.toISOString() ?? null,
    lastErrorAt: connector.lastErrorAt?.toISOString() ?? null,
    updatedAt: connector.updatedAt.toISOString(),
    createdAt: connector.createdAt.toISOString()
  };
}

export async function getConnectorConfigById(id: string, tenantId: string) {
  return prisma.connectorConfig.findFirst({
    where: { id, tenantId },
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 12
      },
      objectLinks: {
        orderBy: { updatedAt: 'desc' },
        take: 25
      }
    }
  });
}

export async function listConnectorConfigs(tenantId: string) {
  return prisma.connectorConfig.findMany({
    where: { tenantId },
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 12
      },
      objectLinks: {
        orderBy: { updatedAt: 'desc' },
        take: 25
      }
    },
    orderBy: [{ provider: 'asc' }, { updatedAt: 'desc' }]
  });
}

export async function getActiveConnectorConfigs(
  tenantId: string,
  providers?: Array<'SLACK' | 'JIRA' | 'CONFLUENCE' | 'GOOGLE_DRIVE' | 'OUTBOUND_WEBHOOK'>
) {
  return prisma.connectorConfig.findMany({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'NEEDS_ATTENTION'] },
      ...(providers?.length ? { provider: { in: providers } } : {})
    },
    orderBy: { updatedAt: 'desc' }
  });
}

export async function upsertConnectorConfig(args: {
  id?: string;
  tenantId: string;
  userId: string;
  provider: 'SLACK' | 'JIRA' | 'CONFLUENCE' | 'GOOGLE_DRIVE' | 'OUTBOUND_WEBHOOK';
  name: string;
  description?: string | null;
  mode: 'SIMULATED' | 'LIVE';
  status: 'ACTIVE' | 'NEEDS_ATTENTION' | 'DISABLED';
  configJson: Prisma.InputJsonValue;
  secretPayload?: SecretPayload;
}) {
  const secretCiphertext =
    args.secretPayload && Object.keys(args.secretPayload).length
      ? serializeSecretPayload(args.secretPayload)
      : undefined;

  const existing =
    args.id
      ? await prisma.connectorConfig.findFirst({
          where: { id: args.id, tenantId: args.tenantId }
        })
      : await prisma.connectorConfig.findUnique({
          where: {
            tenantId_provider: {
              tenantId: args.tenantId,
              provider: args.provider
            }
          }
        });

  if (existing) {
    return prisma.connectorConfig.update({
      where: { id: existing.id },
      data: {
        name: args.name,
        description: args.description ?? null,
        mode: args.mode,
        status: args.status,
        configJson: args.configJson,
        secretCiphertext: secretCiphertext === undefined ? undefined : secretCiphertext,
        updatedBy: args.userId,
        lastErrorMessage: args.status === 'DISABLED' ? existing.lastErrorMessage : undefined
      }
    });
  }

  return prisma.connectorConfig.create({
    data: {
      tenantId: args.tenantId,
      provider: args.provider,
      name: args.name,
      description: args.description ?? null,
      mode: args.mode,
      status: args.status,
      configJson: args.configJson,
      secretCiphertext: secretCiphertext ?? null,
      createdBy: args.userId,
      updatedBy: args.userId
    }
  });
}

export async function updateConnectorHealth(args: {
  connectorId: string;
  status: 'SUCCEEDED' | 'FAILED' | 'SKIPPED' | 'PENDING';
  message?: string | null;
}) {
  const now = new Date();
  return prisma.connectorConfig.update({
    where: { id: args.connectorId },
    data: {
      lastHealthStatus: args.status,
      lastHealthCheckedAt: now,
      lastSuccessAt: args.status === 'SUCCEEDED' ? now : undefined,
      lastErrorAt: args.status === 'FAILED' ? now : undefined,
      lastErrorMessage: args.status === 'FAILED' ? args.message ?? 'Connector action failed' : null,
      status: args.status === 'FAILED' ? 'NEEDS_ATTENTION' : args.status === 'SUCCEEDED' ? 'ACTIVE' : undefined
    }
  });
}

export async function recordConnectorActivity(args: {
  tenantId: string;
  connectorId?: string | null;
  provider: 'SLACK' | 'JIRA' | 'CONFLUENCE' | 'GOOGLE_DRIVE' | 'OUTBOUND_WEBHOOK';
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  targetLabel?: string | null;
  externalObjectId?: string | null;
  externalObjectKey?: string | null;
  externalObjectUrl?: string | null;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
  summary: string;
  payloadJson?: Prisma.InputJsonValue;
  errorMessage?: string | null;
  createdBy?: string | null;
}) {
  const activity = await prisma.connectorActivity.create({
    data: {
      tenantId: args.tenantId,
      connectorId: args.connectorId ?? null,
      provider: args.provider,
      action: args.action,
      entityType: args.entityType ?? null,
      entityId: args.entityId ?? null,
      targetLabel: args.targetLabel ?? null,
      externalObjectId: args.externalObjectId ?? null,
      externalObjectKey: args.externalObjectKey ?? null,
      externalObjectUrl: args.externalObjectUrl ?? null,
      status: args.status,
      summary: args.summary,
      payloadJson: args.payloadJson,
      errorMessage: args.errorMessage ?? null,
      createdBy: args.createdBy ?? null
    }
  });

  if (args.connectorId) {
    await updateConnectorHealth({
      connectorId: args.connectorId,
      status: args.status,
      message: args.errorMessage ?? null
    });
  }

  return activity;
}

export async function upsertConnectorObjectLink(args: {
  tenantId: string;
  connectorId: string;
  provider: 'SLACK' | 'JIRA' | 'CONFLUENCE' | 'GOOGLE_DRIVE' | 'OUTBOUND_WEBHOOK';
  entityType: string;
  entityId: string;
  externalObjectId: string;
  externalObjectKey?: string | null;
  externalObjectUrl?: string | null;
  lastSyncStatus: 'SUCCEEDED' | 'FAILED' | 'SKIPPED' | 'PENDING';
}) {
  return prisma.connectorObjectLink.upsert({
    where: {
      connectorId_entityType_entityId: {
        connectorId: args.connectorId,
        entityType: args.entityType,
        entityId: args.entityId
      }
    },
    update: {
      externalObjectId: args.externalObjectId,
      externalObjectKey: args.externalObjectKey ?? null,
      externalObjectUrl: args.externalObjectUrl ?? null,
      lastSyncStatus: args.lastSyncStatus,
      lastSyncedAt: new Date()
    },
    create: {
      tenantId: args.tenantId,
      connectorId: args.connectorId,
      provider: args.provider,
      entityType: args.entityType,
      entityId: args.entityId,
      externalObjectId: args.externalObjectId,
      externalObjectKey: args.externalObjectKey ?? null,
      externalObjectUrl: args.externalObjectUrl ?? null,
      lastSyncStatus: args.lastSyncStatus,
      lastSyncedAt: new Date()
    }
  });
}

export function getConnectorSecrets(connector: {
  secretCiphertext: string | null;
}) {
  return parseSecretPayload(connector.secretCiphertext);
}
