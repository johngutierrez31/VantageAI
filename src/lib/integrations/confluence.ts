import type { ConnectorConfig, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getConnectorSecrets, upsertConnectorObjectLink } from '@/lib/integrations/connectors';
import { loadPublishableArtifact } from '@/lib/integrations/artifacts';

type ConfluenceConnector = Pick<ConnectorConfig, 'id' | 'tenantId' | 'provider' | 'mode' | 'configJson' | 'secretCiphertext'>;

function getConfluenceConfig(connector: ConfluenceConnector) {
  const config = (connector.configJson ?? {}) as Prisma.JsonObject;
  const secrets = getConnectorSecrets(connector);

  return {
    baseUrl: typeof config.confluenceBaseUrl === 'string' ? config.confluenceBaseUrl.replace(/\/+$/, '') : null,
    spaceKey: typeof config.confluenceSpaceKey === 'string' ? config.confluenceSpaceKey : null,
    parentPageId: typeof config.confluenceParentPageId === 'string' ? config.confluenceParentPageId : null,
    email: typeof config.confluenceEmail === 'string' ? config.confluenceEmail : null,
    apiToken: typeof secrets.confluenceApiToken === 'string' ? secrets.confluenceApiToken : null
  };
}

export async function publishArtifactToConfluence(args: {
  tenantId: string;
  connector: ConfluenceConnector;
  artifactType: 'trust_packet' | 'board_brief' | 'after_action_report' | 'quarterly_review';
  artifactId: string;
}) {
  const artifact = await loadPublishableArtifact({
    tenantId: args.tenantId,
    artifactType: args.artifactType,
    artifactId: args.artifactId
  });

  if (!artifact) {
    return {
      status: 'FAILED' as const,
      summary: 'Artifact not found for publishing',
      errorMessage: 'Artifact not found'
    };
  }

  const config = getConfluenceConfig(args.connector);

  if (args.connector.mode === 'SIMULATED') {
    const externalObjectId = `SIM-PAGE-${artifact.entityId.slice(-6).toUpperCase()}`;
    const externalObjectUrl = `/app/settings/connectors#${artifact.entityId}`;

    await upsertConnectorObjectLink({
      tenantId: args.tenantId,
      connectorId: args.connector.id,
      provider: 'CONFLUENCE',
      entityType: artifact.entityType,
      entityId: artifact.entityId,
      externalObjectId,
      externalObjectKey: artifact.title,
      externalObjectUrl,
      lastSyncStatus: 'SUCCEEDED'
    });

    return {
      status: 'SUCCEEDED' as const,
      summary: `Simulated Confluence publish for ${artifact.title}`,
      externalObjectId,
      externalObjectKey: artifact.title,
      externalObjectUrl,
      payloadJson: {
        artifactType: args.artifactType,
        title: artifact.title
      }
    };
  }

  if (!config.baseUrl || !config.spaceKey || !config.email || !config.apiToken) {
    return {
      status: 'FAILED' as const,
      summary: 'Confluence connector is missing required live configuration',
      errorMessage: 'Confluence live mode requires base URL, space key, email, and API token'
    };
  }

  const existingLink = await prisma.connectorObjectLink.findUnique({
    where: {
      connectorId_entityType_entityId: {
        connectorId: args.connector.id,
        entityType: artifact.entityType,
        entityId: artifact.entityId
      }
    }
  });

  const authHeader = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
  const storageValue = artifact.html;

  if (existingLink?.externalObjectId) {
    const currentResponse = await fetch(
      `${config.baseUrl}/wiki/rest/api/content/${existingLink.externalObjectId}?expand=version`,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          Accept: 'application/json'
        }
      }
    );

    const currentText = await currentResponse.text();
    if (!currentResponse.ok) {
      return {
        status: 'FAILED' as const,
        summary: `Confluence version lookup failed with ${currentResponse.status}`,
        errorMessage: currentText.slice(0, 400)
      };
    }

    const currentPayload = JSON.parse(currentText) as { version?: { number?: number } };
    const nextVersion = (currentPayload.version?.number ?? 0) + 1;

    const updateResponse = await fetch(`${config.baseUrl}/wiki/rest/api/content/${existingLink.externalObjectId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: existingLink.externalObjectId,
        type: 'page',
        title: artifact.title,
        space: { key: config.spaceKey },
        version: { number: nextVersion },
        body: {
          storage: {
            value: storageValue,
            representation: 'storage'
          }
        }
      })
    });

    const updateText = await updateResponse.text();
    if (!updateResponse.ok) {
      return {
        status: 'FAILED' as const,
        summary: `Confluence update failed with ${updateResponse.status}`,
        errorMessage: updateText.slice(0, 400)
      };
    }

    const updatePayload = JSON.parse(updateText) as { _links?: { webui?: string } };
    const externalUrl = updatePayload._links?.webui ? `${config.baseUrl}${updatePayload._links.webui}` : existingLink.externalObjectUrl;

    await upsertConnectorObjectLink({
      tenantId: args.tenantId,
      connectorId: args.connector.id,
      provider: 'CONFLUENCE',
      entityType: artifact.entityType,
      entityId: artifact.entityId,
      externalObjectId: existingLink.externalObjectId,
      externalObjectKey: artifact.title,
      externalObjectUrl: externalUrl,
      lastSyncStatus: 'SUCCEEDED'
    });

    return {
      status: 'SUCCEEDED' as const,
      summary: `Updated Confluence page for ${artifact.title}`,
      externalObjectId: existingLink.externalObjectId,
      externalObjectKey: artifact.title,
      externalObjectUrl: externalUrl,
      payloadJson: { artifactType: args.artifactType, title: artifact.title }
    };
  }

  const createResponse = await fetch(`${config.baseUrl}/wiki/rest/api/content`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'page',
      title: artifact.title,
      space: { key: config.spaceKey },
      ancestors: config.parentPageId ? [{ id: config.parentPageId }] : [],
      body: {
        storage: {
          value: storageValue,
          representation: 'storage'
        }
      }
    })
  });

  const createText = await createResponse.text();
  if (!createResponse.ok) {
    return {
      status: 'FAILED' as const,
      summary: `Confluence create failed with ${createResponse.status}`,
      errorMessage: createText.slice(0, 400)
    };
  }

  const createPayload = JSON.parse(createText) as { id?: string; title?: string; _links?: { webui?: string } };
  const externalObjectId = createPayload.id ?? artifact.entityId;
  const externalObjectKey = createPayload.title ?? artifact.title;
  const externalObjectUrl = createPayload._links?.webui ? `${config.baseUrl}${createPayload._links.webui}` : null;

  await upsertConnectorObjectLink({
    tenantId: args.tenantId,
    connectorId: args.connector.id,
    provider: 'CONFLUENCE',
    entityType: artifact.entityType,
    entityId: artifact.entityId,
    externalObjectId,
    externalObjectKey,
    externalObjectUrl,
    lastSyncStatus: 'SUCCEEDED'
  });

  return {
    status: 'SUCCEEDED' as const,
    summary: `Published ${artifact.title} to Confluence`,
    externalObjectId,
    externalObjectKey,
    externalObjectUrl,
    payloadJson: { artifactType: args.artifactType, title: artifact.title }
  };
}
