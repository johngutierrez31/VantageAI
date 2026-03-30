import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getSessionContext } from '@/lib/auth/session';
import { authBaseUrl } from '@/lib/auth/options';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError, notFound } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import {
  getConnectorConfigById,
  getConnectorSecrets,
  recordConnectorActivity,
  toPrismaJson
} from '@/lib/integrations/connectors';
import { sendSlackNotification } from '@/lib/integrations/slack';
import { sendWebhookNotification } from '@/lib/integrations/webhook';
import { testGoogleDriveHealth } from '@/lib/integrations/google-drive';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const connector = await getConnectorConfigById(params.id, session.tenantId);
    if (!connector) return notFound('Connector not found');

    let result: {
      status: 'SUCCEEDED' | 'FAILED' | 'SKIPPED' | 'PENDING';
      summary: string;
      payloadJson?: Prisma.InputJsonValue;
      errorMessage?: string | null;
    };

    if (connector.provider === 'SLACK') {
      result = await sendSlackNotification({
        connector,
        eventKey: 'manual_notification',
        title: 'Vantage connector health check',
        body: 'This is a health check from the Vantage connector panel.',
        href: `${authBaseUrl}/app/settings/connectors`
      });
    } else if (connector.provider === 'OUTBOUND_WEBHOOK') {
      result = await sendWebhookNotification({
        connector,
        eventKey: 'manual_notification',
        title: 'Vantage connector health check',
        body: 'This is a health check from the Vantage connector panel.',
        href: `${authBaseUrl}/app/settings/connectors`
      });
    } else if (connector.provider === 'JIRA') {
      if (connector.mode === 'SIMULATED') {
        result = {
          status: 'SUCCEEDED',
          summary: 'Simulated Jira health check passed'
        };
      } else {
        const config = connector.configJson as Prisma.JsonObject;
        const secrets = getConnectorSecrets(connector);
        const baseUrl = typeof config.jiraBaseUrl === 'string' ? config.jiraBaseUrl.replace(/\/+$/, '') : null;
        const email = typeof config.jiraEmail === 'string' ? config.jiraEmail : null;
        const token = typeof secrets.jiraApiToken === 'string' ? secrets.jiraApiToken : null;

        if (!baseUrl || !email || !token) {
          result = {
            status: 'FAILED',
            summary: 'Jira connector is missing required live configuration',
            errorMessage: 'Provide base URL, email, and API token'
          };
        } else {
          const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
            headers: {
              Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
              Accept: 'application/json'
            }
          });
          const text = await response.text();
          result = response.ok
            ? {
                status: 'SUCCEEDED',
                summary: 'Jira health check passed',
                payloadJson: toPrismaJson({ response: text.slice(0, 200) })
              }
            : {
                status: 'FAILED',
                summary: `Jira health check failed with ${response.status}`,
                errorMessage: text.slice(0, 400)
              };
        }
      }
    } else if (connector.provider === 'CONFLUENCE') {
      if (connector.mode === 'SIMULATED') {
        result = {
          status: 'SUCCEEDED',
          summary: 'Simulated Confluence health check passed'
        };
      } else {
        const config = connector.configJson as Prisma.JsonObject;
        const secrets = getConnectorSecrets(connector);
        const baseUrl =
          typeof config.confluenceBaseUrl === 'string' ? config.confluenceBaseUrl.replace(/\/+$/, '') : null;
        const email = typeof config.confluenceEmail === 'string' ? config.confluenceEmail : null;
        const token = typeof secrets.confluenceApiToken === 'string' ? secrets.confluenceApiToken : null;
        const spaceKey = typeof config.confluenceSpaceKey === 'string' ? config.confluenceSpaceKey : null;

        if (!baseUrl || !email || !token || !spaceKey) {
          result = {
            status: 'FAILED',
            summary: 'Confluence connector is missing required live configuration',
            errorMessage: 'Provide base URL, space key, email, and API token'
          };
        } else {
          const response = await fetch(`${baseUrl}/wiki/rest/api/space/${spaceKey}`, {
            headers: {
              Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
              Accept: 'application/json'
            }
          });
          const text = await response.text();
          result = response.ok
            ? {
                status: 'SUCCEEDED',
                summary: 'Confluence health check passed',
                payloadJson: toPrismaJson({ response: text.slice(0, 200) })
              }
            : {
                status: 'FAILED',
                summary: `Confluence health check failed with ${response.status}`,
                errorMessage: text.slice(0, 400)
              };
        }
      }
    } else if (connector.provider === 'GOOGLE_DRIVE') {
      result = await testGoogleDriveHealth(connector);
    } else {
      result = {
        status: connector.mode === 'SIMULATED' ? 'SUCCEEDED' : 'SKIPPED',
        summary: 'No health test implemented'
      };
    }

    const activity = await recordConnectorActivity({
      tenantId: session.tenantId,
      connectorId: connector.id,
      provider: connector.provider,
      action: 'health_check',
      status: result.status,
      summary: result.summary,
      payloadJson: result.payloadJson,
      errorMessage: result.errorMessage ?? null,
      createdBy: session.userId
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'connector_config',
      entityId: connector.id,
      action: 'health_check',
      metadata: {
        provider: connector.provider,
        status: result.status,
        activityId: activity.id
      }
    });

    return NextResponse.json({
      connectorId: connector.id,
      status: result.status,
      summary: result.summary
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
