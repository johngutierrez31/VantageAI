import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { connectorUpsertSchema } from '@/lib/validation/integrations';

type ConnectorInput = z.infer<typeof connectorUpsertSchema>;

export function buildConnectorPersistencePayload(payload: ConnectorInput) {
  const enabledEventKeys = payload.enabledEventKeys ?? [];

  if (payload.provider === 'SLACK') {
    return {
      configJson: {
        defaultChannel: payload.defaultChannel ?? null,
        enabledEventKeys
      } satisfies Prisma.InputJsonObject,
      secretPayload: payload.webhookUrl ? { webhookUrl: payload.webhookUrl } : undefined
    };
  }

  if (payload.provider === 'JIRA') {
    return {
      configJson: {
        jiraBaseUrl: payload.jiraBaseUrl ?? null,
        jiraProjectKey: payload.jiraProjectKey ?? null,
        jiraIssueType: payload.jiraIssueType ?? 'Task',
        jiraEmail: payload.jiraEmail ?? null,
        statusMappings: payload.statusMappings ?? []
      } satisfies Prisma.InputJsonObject,
      secretPayload: payload.jiraApiToken ? { jiraApiToken: payload.jiraApiToken } : undefined
    };
  }

  if (payload.provider === 'CONFLUENCE') {
    return {
      configJson: {
        confluenceBaseUrl: payload.confluenceBaseUrl ?? null,
        confluenceSpaceKey: payload.confluenceSpaceKey ?? null,
        confluenceParentPageId: payload.confluenceParentPageId ?? null,
        confluenceEmail: payload.confluenceEmail ?? null
      } satisfies Prisma.InputJsonObject,
      secretPayload: payload.confluenceApiToken ? { confluenceApiToken: payload.confluenceApiToken } : undefined
    };
  }

  if (payload.provider === 'GOOGLE_DRIVE') {
    return {
      configJson: {
        googleDriveFolderId: payload.googleDriveFolderId ?? null
      } satisfies Prisma.InputJsonObject,
      secretPayload: payload.googleServiceAccountJson
        ? { googleServiceAccountJson: payload.googleServiceAccountJson }
        : undefined
    };
  }

  return {
    configJson: {
      enabledEventKeys,
      outboundWebhookUrl: payload.outboundWebhookUrl ?? null
    } satisfies Prisma.InputJsonObject,
    secretPayload: payload.outboundWebhookSecret
      ? { outboundWebhookSecret: payload.outboundWebhookSecret }
      : undefined
  };
}
