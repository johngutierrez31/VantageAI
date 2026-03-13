import type { ConnectorConfig, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getConnectorSecrets, upsertConnectorObjectLink } from '@/lib/integrations/connectors';

type JiraEntityType = 'finding' | 'risk' | 'task' | 'roadmap_item';
type JiraConnector = Pick<ConnectorConfig, 'id' | 'tenantId' | 'provider' | 'mode' | 'configJson' | 'secretCiphertext'>;

function toAdf(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: block }]
    }));

  return {
    version: 1,
    type: 'doc',
    content: paragraphs.length ? paragraphs : [{ type: 'paragraph', content: [{ type: 'text', text: 'No details provided.' }] }]
  };
}

function sanitizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').slice(0, 255);
}

function getJiraConfig(connector: JiraConnector) {
  const config = (connector.configJson ?? {}) as Prisma.JsonObject;
  const secrets = getConnectorSecrets(connector);

  return {
    baseUrl: typeof config.jiraBaseUrl === 'string' ? config.jiraBaseUrl.replace(/\/+$/, '') : null,
    projectKey: typeof config.jiraProjectKey === 'string' ? config.jiraProjectKey : null,
    issueType: typeof config.jiraIssueType === 'string' ? config.jiraIssueType : 'Task',
    email: typeof config.jiraEmail === 'string' ? config.jiraEmail : null,
    statusMappings: Array.isArray(config.statusMappings)
      ? config.statusMappings
          .map((value) => {
            if (!value || typeof value !== 'object') return null;
            const source = typeof (value as { source?: unknown }).source === 'string' ? (value as { source: string }).source : null;
            const target = typeof (value as { target?: unknown }).target === 'string' ? (value as { target: string }).target : null;
            return source && target ? { source, target } : null;
          })
          .filter((value): value is { source: string; target: string } => Boolean(value))
      : [],
    apiToken: typeof secrets.jiraApiToken === 'string' ? secrets.jiraApiToken : null
  };
}

async function loadEntity(tenantId: string, entityType: JiraEntityType, entityId: string) {
  if (entityType === 'finding') {
    const finding = await prisma.finding.findFirst({
      where: { tenantId, id: entityId }
    });
    if (!finding) return null;
    return {
      entityType,
      id: finding.id,
      title: finding.title,
      status: finding.status,
      body: [
        `Priority: ${finding.priority}`,
        finding.controlCode ? `Control: ${finding.controlCode}` : null,
        finding.supportStrength ? `Support strength: ${finding.supportStrength}` : null,
        '',
        finding.description
      ]
        .filter(Boolean)
        .join('\n'),
      labels: ['vantage-finding', `vantage-priority-${sanitizeLabel(finding.priority)}`]
    };
  }

  if (entityType === 'risk') {
    const risk = await prisma.riskRegisterItem.findFirst({
      where: { tenantId, id: entityId }
    });
    if (!risk) return null;
    return {
      entityType,
      id: risk.id,
      title: risk.title,
      status: risk.status,
      body: [
        `Severity: ${risk.severity}`,
        `Likelihood: ${risk.likelihood}`,
        `Impact: ${risk.impact}`,
        risk.targetDueAt ? `Target due: ${risk.targetDueAt.toISOString()}` : null,
        '',
        risk.description,
        '',
        `Business impact: ${risk.businessImpactSummary}`
      ]
        .filter(Boolean)
        .join('\n'),
      labels: ['vantage-risk', `vantage-severity-${sanitizeLabel(risk.severity)}`]
    };
  }

  if (entityType === 'task') {
    const task = await prisma.task.findFirst({
      where: { tenantId, id: entityId }
    });
    if (!task) return null;
    return {
      entityType,
      id: task.id,
      title: task.title,
      status: task.status,
      body: [
        `Priority: ${task.priority}`,
        task.dueDate ? `Due date: ${task.dueDate.toISOString()}` : null,
        task.assignee ? `Assignee: ${task.assignee}` : null,
        task.responseOpsPhase ? `Response phase: ${task.responseOpsPhase}` : null,
        '',
        task.description ?? 'No additional description provided.'
      ]
        .filter(Boolean)
        .join('\n'),
      labels: ['vantage-task', `vantage-priority-${sanitizeLabel(task.priority)}`]
    };
  }

  const roadmapItem = await prisma.roadmapItem.findFirst({
    where: { tenantId, id: entityId }
  });
  if (!roadmapItem) return null;

  return {
    entityType,
    id: roadmapItem.id,
    title: roadmapItem.title,
    status: roadmapItem.status,
    body: [
      `Horizon: ${roadmapItem.horizon}`,
      roadmapItem.dueAt ? `Due date: ${roadmapItem.dueAt.toISOString()}` : null,
      roadmapItem.ownerUserId ? `Owner user ID: ${roadmapItem.ownerUserId}` : null,
      '',
      roadmapItem.rationale,
      '',
      `Expected impact: ${roadmapItem.expectedImpact}`
    ]
      .filter(Boolean)
      .join('\n'),
    labels: ['vantage-roadmap-item', `vantage-horizon-${sanitizeLabel(roadmapItem.horizon)}`]
  };
}

export async function syncEntityToJira(args: {
  tenantId: string;
  connector: JiraConnector;
  entityType: JiraEntityType;
  entityId: string;
  vantageUrl: string;
}) {
  const config = getJiraConfig(args.connector);
  const entity = await loadEntity(args.tenantId, args.entityType, args.entityId);
  if (!entity) {
    return {
      status: 'FAILED' as const,
      summary: `Unable to find ${args.entityType} ${args.entityId}`,
      errorMessage: 'Entity not found'
    };
  }

  const mappedStatus = config.statusMappings.find((entry) => entry.source === entity.status)?.target ?? entity.status;
  const labels = [...entity.labels, `vantage-status-${sanitizeLabel(mappedStatus)}`];

  if (args.connector.mode === 'SIMULATED') {
    const simulatedKey = `SIM-${entity.entityType.toUpperCase()}-${entity.id.slice(-6).toUpperCase()}`;
    const simulatedUrl = `${args.vantageUrl}/app/settings/connectors`;

    await upsertConnectorObjectLink({
      tenantId: args.tenantId,
      connectorId: args.connector.id,
      provider: 'JIRA',
      entityType: entity.entityType,
      entityId: entity.id,
      externalObjectId: simulatedKey,
      externalObjectKey: simulatedKey,
      externalObjectUrl: simulatedUrl,
      lastSyncStatus: 'SUCCEEDED'
    });

    return {
      status: 'SUCCEEDED' as const,
      summary: `Simulated Jira sync created ${simulatedKey}`,
      externalObjectId: simulatedKey,
      externalObjectKey: simulatedKey,
      externalObjectUrl: simulatedUrl,
      payloadJson: {
        summary: entity.title,
        labels,
        status: mappedStatus
      }
    };
  }

  if (!config.baseUrl || !config.projectKey || !config.email || !config.apiToken) {
    return {
      status: 'FAILED' as const,
      summary: 'Jira connector is missing required live configuration',
      errorMessage: 'Jira live mode requires base URL, project key, email, and API token'
    };
  }

  const existingLink = await prisma.connectorObjectLink.findUnique({
    where: {
      connectorId_entityType_entityId: {
        connectorId: args.connector.id,
        entityType: entity.entityType,
        entityId: entity.id
      }
    }
  });

  const authHeader = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
  const fields = {
    project: { key: config.projectKey },
    summary: entity.title,
    issuetype: { name: config.issueType },
    labels,
    description: toAdf(`${entity.body}\n\nOpen in Vantage: ${args.vantageUrl}`)
  };

  if (existingLink?.externalObjectId) {
    const updateResponse = await fetch(`${config.baseUrl}/rest/api/3/issue/${existingLink.externalObjectId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });

    if (!updateResponse.ok) {
      const text = await updateResponse.text();
      return {
        status: 'FAILED' as const,
        summary: `Jira update failed with ${updateResponse.status}`,
        errorMessage: text.slice(0, 400)
      };
    }

    await fetch(`${config.baseUrl}/rest/api/3/issue/${existingLink.externalObjectId}/comment`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body: toAdf(`Updated from Vantage.\nCurrent status mapping: ${mappedStatus}\n${args.vantageUrl}`)
      })
    });

    await upsertConnectorObjectLink({
      tenantId: args.tenantId,
      connectorId: args.connector.id,
      provider: 'JIRA',
      entityType: entity.entityType,
      entityId: entity.id,
      externalObjectId: existingLink.externalObjectId,
      externalObjectKey: existingLink.externalObjectKey,
      externalObjectUrl: existingLink.externalObjectUrl,
      lastSyncStatus: 'SUCCEEDED'
    });

    return {
      status: 'SUCCEEDED' as const,
      summary: `Updated Jira issue ${existingLink.externalObjectKey ?? existingLink.externalObjectId}`,
      externalObjectId: existingLink.externalObjectId,
      externalObjectKey: existingLink.externalObjectKey,
      externalObjectUrl: existingLink.externalObjectUrl,
      payloadJson: { labels, status: mappedStatus }
    };
  }

  const createResponse = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });

  const createText = await createResponse.text();
  if (!createResponse.ok) {
    return {
      status: 'FAILED' as const,
      summary: `Jira create failed with ${createResponse.status}`,
      errorMessage: createText.slice(0, 400)
    };
  }

  const payload = JSON.parse(createText) as { id?: string; key?: string; self?: string };
  const externalObjectId = payload.id ?? payload.key ?? entity.id;
  const externalObjectKey = payload.key ?? payload.id ?? null;
  const externalObjectUrl = payload.key ? `${config.baseUrl}/browse/${payload.key}` : payload.self ?? null;

  await upsertConnectorObjectLink({
    tenantId: args.tenantId,
    connectorId: args.connector.id,
    provider: 'JIRA',
    entityType: entity.entityType,
    entityId: entity.id,
    externalObjectId,
    externalObjectKey,
    externalObjectUrl,
    lastSyncStatus: 'SUCCEEDED'
  });

  return {
    status: 'SUCCEEDED' as const,
    summary: `Created Jira issue ${externalObjectKey ?? externalObjectId}`,
    externalObjectId,
    externalObjectKey,
    externalObjectUrl,
    payloadJson: { labels, status: mappedStatus }
  };
}
