import { createSign } from 'node:crypto';
import type { ConnectorConfig, Prisma } from '@prisma/client';
import { getConnectorSecrets, toPrismaJson, upsertConnectorObjectLink } from '@/lib/integrations/connectors';
import { loadPublishableArtifact } from '@/lib/integrations/artifacts';

type GoogleDriveConnector = Pick<
  ConnectorConfig,
  'id' | 'tenantId' | 'provider' | 'mode' | 'configJson' | 'secretCiphertext'
>;

type ServiceAccountPayload = {
  client_email: string;
  private_key: string;
};

function toBase64Url(value: string | Buffer) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parseServiceAccount(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccountPayload>;
    if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') return null;
    return parsed as ServiceAccountPayload;
  } catch {
    return null;
  }
}

function getDriveConfig(connector: GoogleDriveConnector) {
  const config = (connector.configJson ?? {}) as Prisma.JsonObject;
  const secrets = getConnectorSecrets(connector);
  const rawServiceAccount =
    typeof secrets.googleServiceAccountJson === 'string' ? secrets.googleServiceAccountJson : null;

  return {
    folderId: typeof config.googleDriveFolderId === 'string' ? config.googleDriveFolderId : null,
    serviceAccount: rawServiceAccount ? parseServiceAccount(rawServiceAccount) : null
  };
}

async function getGoogleAccessToken(serviceAccount: ServiceAccountPayload) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedClaims = toBase64Url(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = toBase64Url(signer.sign(serviceAccount.private_key));
  const assertion = `${signingInput}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Google OAuth token exchange failed with ${response.status}: ${text.slice(0, 300)}`);
  }

  const payload = JSON.parse(text) as { access_token?: string };
  if (!payload.access_token) throw new Error('Google OAuth token exchange returned no access token');
  return payload.access_token;
}

export async function testGoogleDriveHealth(connector: GoogleDriveConnector) {
  if (connector.mode === 'SIMULATED') {
    return {
      status: 'SUCCEEDED' as const,
      summary: 'Simulated Google Drive health check passed'
    };
  }

  const config = getDriveConfig(connector);
  if (!config.folderId || !config.serviceAccount) {
    return {
      status: 'FAILED' as const,
      summary: 'Google Drive connector is missing required live configuration',
      errorMessage: 'Provide folder ID and service account JSON'
    };
  }

  try {
    const accessToken = await getGoogleAccessToken(config.serviceAccount);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        config.folderId
      )}?fields=id,name,mimeType`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      }
    );
    const text = await response.text();

    if (!response.ok) {
      return {
        status: 'FAILED' as const,
        summary: `Google Drive health check failed with ${response.status}`,
        errorMessage: text.slice(0, 400)
      };
    }

    return {
      status: 'SUCCEEDED' as const,
      summary: 'Google Drive health check passed',
      payloadJson: toPrismaJson({ response: text.slice(0, 200) })
    };
  } catch (error) {
    return {
      status: 'FAILED' as const,
      summary: 'Google Drive health check failed',
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function publishArtifactToGoogleDrive(args: {
  tenantId: string;
  connector: GoogleDriveConnector;
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

  if (args.connector.mode === 'SIMULATED') {
    const externalObjectId = `SIM-DRIVE-${artifact.entityId.slice(-6).toUpperCase()}`;
    const externalObjectUrl = '/app/settings/connectors';

    await upsertConnectorObjectLink({
      tenantId: args.tenantId,
      connectorId: args.connector.id,
      provider: 'GOOGLE_DRIVE',
      entityType: artifact.entityType,
      entityId: artifact.entityId,
      externalObjectId,
      externalObjectKey: `${artifact.title}.html`,
      externalObjectUrl,
      lastSyncStatus: 'SUCCEEDED'
    });

    return {
      status: 'SUCCEEDED' as const,
      summary: `Simulated Google Drive publish for ${artifact.title}`,
      externalObjectId,
      externalObjectKey: `${artifact.title}.html`,
      externalObjectUrl,
      payloadJson: toPrismaJson({
        artifactType: args.artifactType,
        title: artifact.title
      })
    };
  }

  const config = getDriveConfig(args.connector);
  if (!config.folderId || !config.serviceAccount) {
    return {
      status: 'FAILED' as const,
      summary: 'Google Drive connector is missing required live configuration',
      errorMessage: 'Google Drive live mode requires folder ID and service account JSON'
    };
  }

  try {
    const accessToken = await getGoogleAccessToken(config.serviceAccount);
    const fileName = `${artifact.title}.html`;

    const metadata = {
      name: fileName,
      mimeType: 'text/html',
      parents: [config.folderId]
    };

    const boundary = `vantage-${Date.now().toString(16)}`;
    const multipartBody =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
      `${artifact.html}\r\n` +
      `--${boundary}--`;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      }
    );
    const text = await response.text();

    if (!response.ok) {
      return {
        status: 'FAILED' as const,
        summary: `Google Drive publish failed with ${response.status}`,
        errorMessage: text.slice(0, 400)
      };
    }

    const payload = JSON.parse(text) as { id?: string; name?: string; webViewLink?: string };
    const externalObjectId = payload.id ?? artifact.entityId;
    const externalObjectKey = payload.name ?? fileName;
    const externalObjectUrl = payload.webViewLink ?? null;

    await upsertConnectorObjectLink({
      tenantId: args.tenantId,
      connectorId: args.connector.id,
      provider: 'GOOGLE_DRIVE',
      entityType: artifact.entityType,
      entityId: artifact.entityId,
      externalObjectId,
      externalObjectKey,
      externalObjectUrl,
      lastSyncStatus: 'SUCCEEDED'
    });

    return {
      status: 'SUCCEEDED' as const,
      summary: `Published ${artifact.title} to Google Drive`,
      externalObjectId,
      externalObjectKey,
      externalObjectUrl,
      payloadJson: toPrismaJson({ artifactType: args.artifactType, title: artifact.title })
    };
  } catch (error) {
    return {
      status: 'FAILED' as const,
      summary: 'Google Drive publish failed',
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
}
