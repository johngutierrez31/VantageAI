import { randomUUID } from 'node:crypto';
import {
  type AdoptionImportSource,
  type AdoptionImportStatus,
  type AdoptionImportTarget,
  type ApprovedAnswerScope,
  type ConnectorProvider,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentType,
  type Prisma,
  type RiskLevel,
  type RiskRegisterStatus,
  type TaskPriority
} from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { assertTenantReviewer } from '@/lib/trust/reviewers';
import { createIncidentRecord, updateIncidentRecord } from '@/lib/response-ops/records';

type RowValueMap = Record<string, string>;

type ImportResultRow = {
  index: number;
  label: string;
  entityId?: string;
  action?: 'created' | 'updated';
  error?: string;
};

type AdoptionImportArgs = {
  tenantId: string;
  userId: string;
  input: {
    target: AdoptionImportTarget;
    source: AdoptionImportSource;
    content: string;
    sourceLabel?: string;
    connectorId?: string;
    ownerUserId?: string;
    approvedAnswerScope?: ApprovedAnswerScope;
    incidentType?: IncidentType;
    incidentSeverity?: IncidentSeverity;
  };
};

const MANUAL_FIELDS: Record<AdoptionImportTarget, string[]> = {
  FINDINGS: ['title', 'description', 'priority', 'status', 'controlCode'],
  RISKS: ['title', 'description', 'businessImpactSummary', 'severity', 'likelihood', 'impact', 'status'],
  APPROVED_ANSWERS: ['questionText', 'answerText', 'scope'],
  INCIDENTS: ['title', 'description', 'incidentType', 'severity', 'status', 'detectionSource']
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeQuestion(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseDelimitedRow(value: string, delimiter: string) {
  const output: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const nextChar = value[index + 1];

    if (char === '"') {
      if (quoted && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }

      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      output.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  output.push(current.trim());
  return output;
}

function parseCsvRows(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseDelimitedRow(lines[0], ',').map(normalizeKey);
  return lines.slice(1).map((line) => {
    const cells = parseDelimitedRow(line, ',');
    return headers.reduce<RowValueMap>((record, header, index) => {
      record[header] = cells[index] ?? '';
      return record;
    }, {});
  });
}

function parseManualRows(content: string, target: AdoptionImportTarget) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const expectedKeys = MANUAL_FIELDS[target].map(normalizeKey);
  const firstRow = parseDelimitedRow(lines[0], '|').map(normalizeKey);
  const hasHeader = expectedKeys.every((key) => firstRow.includes(key));
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const headers = hasHeader ? firstRow : expectedKeys;

  return dataLines.map((line) => {
    const cells = parseDelimitedRow(line, '|');
    return headers.reduce<RowValueMap>((record, header, index) => {
      record[header] = cells[index] ?? '';
      return record;
    }, {});
  });
}

function getValue(row: RowValueMap, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[normalizeKey(alias)];
    if (value) return value.trim();
  }

  return '';
}

function parsePriority(value: string): TaskPriority {
  const normalized = normalizeKey(value);
  if (normalized === 'critical') return 'CRITICAL';
  if (normalized === 'high') return 'HIGH';
  if (normalized === 'low') return 'LOW';
  return 'MEDIUM';
}

function parseFindingStatus(value: string) {
  const normalized = normalizeKey(value);
  if (normalized === 'resolved') return 'RESOLVED' as const;
  if (normalized === 'archived') return 'ARCHIVED' as const;
  if (normalized === 'inprogress') return 'IN_PROGRESS' as const;
  return 'OPEN' as const;
}

function parseRiskLevel(value: string): RiskLevel {
  const normalized = normalizeKey(value);
  if (normalized === 'critical') return 'CRITICAL';
  if (normalized === 'high') return 'HIGH';
  if (normalized === 'low') return 'LOW';
  return 'MEDIUM';
}

function parseRiskStatus(value: string): RiskRegisterStatus {
  const normalized = normalizeKey(value);
  if (normalized === 'closed') return 'CLOSED';
  if (normalized === 'accepted') return 'ACCEPTED';
  if (normalized === 'mitigating') return 'MITIGATING';
  if (normalized === 'inreview') return 'IN_REVIEW';
  return 'OPEN';
}

function parseIncidentType(value: string, fallback: IncidentType): IncidentType {
  const normalized = normalizeKey(value);
  if (normalized === 'identitycompromise') return 'IDENTITY_COMPROMISE';
  if (normalized === 'ransomware') return 'RANSOMWARE';
  if (normalized === 'phishing') return 'PHISHING';
  if (normalized === 'thirdpartybreach') return 'THIRD_PARTY_BREACH';
  if (normalized === 'cloudexposure') return 'CLOUD_EXPOSURE';
  if (normalized === 'lostdevice') return 'LOST_DEVICE';
  if (normalized === 'aimisuse') return 'AI_MISUSE';
  if (normalized === 'other') return 'OTHER';
  return fallback;
}

function parseIncidentSeverity(value: string, fallback: IncidentSeverity): IncidentSeverity {
  const normalized = normalizeKey(value);
  if (normalized === 'critical') return 'CRITICAL';
  if (normalized === 'high') return 'HIGH';
  if (normalized === 'low') return 'LOW';
  return normalized === 'medium' ? 'MEDIUM' : fallback;
}

function parseIncidentStatus(value: string): IncidentStatus {
  const normalized = normalizeKey(value);
  if (normalized === 'triage') return 'TRIAGE';
  if (normalized === 'active') return 'ACTIVE';
  if (normalized === 'contained') return 'CONTAINED';
  if (normalized === 'recovering') return 'RECOVERING';
  if (normalized === 'resolved') return 'RESOLVED';
  if (normalized === 'postincidentreview') return 'POST_INCIDENT_REVIEW';
  if (normalized === 'archived') return 'ARCHIVED';
  return 'NEW';
}

function parseApprovedAnswerScope(value: string, fallback: ApprovedAnswerScope): ApprovedAnswerScope {
  const normalized = normalizeKey(value);
  if (normalized === 'tenantspecific') return 'TENANT_SPECIFIC';
  if (normalized === 'reusable') return 'REUSABLE';
  return fallback;
}

export function summarizeImport(args: {
  target: AdoptionImportTarget;
  source: AdoptionImportSource;
  createdCount: number;
  failedCount: number;
}) {
  const targetLabel =
    args.target === 'APPROVED_ANSWERS'
      ? 'approved answer'
      : args.target === 'INCIDENTS'
        ? 'incident'
        : args.target === 'RISKS'
          ? 'risk'
          : 'finding';
  const sourceLabel =
    args.source === 'CONNECTOR_EXPORT'
      ? 'connector-assisted import'
      : args.source === 'CSV'
        ? 'CSV import'
        : 'manual import';

  return `${sourceLabel} created ${args.createdCount} ${targetLabel}${args.createdCount === 1 ? '' : 's'}${args.failedCount ? ` with ${args.failedCount} row failure${args.failedCount === 1 ? '' : 's'}` : ''}.`;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function parseImportRows(target: AdoptionImportTarget, source: AdoptionImportSource, content: string) {
  return source === 'CSV' || source === 'CONNECTOR_EXPORT' ? parseCsvRows(content) : parseManualRows(content, target);
}

export async function listAdoptionImports(tenantId: string) {
  return prisma.adoptionImport.findMany({
    where: { tenantId },
    include: {
      connector: {
        select: {
          id: true,
          name: true,
          provider: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
}

export async function importAdoptionRecords(args: AdoptionImportArgs) {
  if (args.input.ownerUserId) {
    await assertTenantReviewer(args.tenantId, args.input.ownerUserId);
  }

  let connector:
    | {
        id: string;
        name: string;
        provider: ConnectorProvider;
      }
    | null = null;

  if (args.input.connectorId) {
    connector = await prisma.connectorConfig.findFirst({
      where: {
        id: args.input.connectorId,
        tenantId: args.tenantId
      },
      select: {
        id: true,
        name: true,
        provider: true
      }
    });

    if (!connector) {
      throw new Error('CONNECTOR_NOT_FOUND');
    }
  }

  const rows = parseImportRows(args.input.target, args.input.source, args.input.content);
  if (!rows.length) {
    throw new Error('NO_IMPORT_ROWS');
  }

  const results: ImportResultRow[] = [];

  for (const [index, row] of rows.entries()) {
    try {
      if (args.input.target === 'FINDINGS') {
        const title = getValue(row, ['title', 'name']);
        if (!title) {
          throw new Error('Missing title');
        }

        const finding = await prisma.finding.create({
          data: {
            tenantId: args.tenantId,
            sourceType: 'ADOPTION_IMPORT',
            status: parseFindingStatus(getValue(row, ['status'])),
            priority: parsePriority(getValue(row, ['priority'])),
            title,
            description: getValue(row, ['description', 'details', 'summary']) || title,
            controlCode: getValue(row, ['controlCode', 'control']) || null,
            ownerUserId: args.input.ownerUserId ?? null,
            createdBy: args.userId
          }
        });

        results.push({
          index,
          label: title,
          entityId: finding.id,
          action: 'created'
        });
        continue;
      }

      if (args.input.target === 'RISKS') {
        const title = getValue(row, ['title', 'name']);
        const description = getValue(row, ['description', 'details']);

        if (!title || !description) {
          throw new Error('Missing title or description');
        }

        const risk = await prisma.riskRegisterItem.create({
          data: {
            tenantId: args.tenantId,
            title,
            normalizedRiskStatement: normalizeQuestion(title),
            description,
            businessImpactSummary: getValue(row, ['businessImpactSummary', 'businessImpact', 'impactsummary']) || description,
            sourceType: 'MANUAL',
            sourceModule: 'MANUAL',
            sourceKey: `adoption-import:${randomUUID()}`,
            sourceReference: args.input.sourceLabel ?? connector?.name ?? null,
            severity: parseRiskLevel(getValue(row, ['severity'])),
            likelihood: parseRiskLevel(getValue(row, ['likelihood'])),
            impact: parseRiskLevel(getValue(row, ['impact'])),
            status: parseRiskStatus(getValue(row, ['status'])),
            ownerUserId: args.input.ownerUserId ?? null,
            createdBy: args.userId
          }
        });

        results.push({
          index,
          label: title,
          entityId: risk.id,
          action: 'created'
        });
        continue;
      }

      if (args.input.target === 'APPROVED_ANSWERS') {
        const questionText = getValue(row, ['questionText', 'question', 'prompt']);
        const answerText = getValue(row, ['answerText', 'answer']);

        if (!questionText || !answerText) {
          throw new Error('Missing question or answer text');
        }

        const scope = parseApprovedAnswerScope(
          getValue(row, ['scope']),
          args.input.approvedAnswerScope ?? 'REUSABLE'
        );

        const approvedAnswer = await prisma.approvedAnswer.upsert({
          where: {
            tenantId_normalizedQuestion_scope: {
              tenantId: args.tenantId,
              normalizedQuestion: normalizeQuestion(questionText),
              scope
            }
          },
          update: {
            questionText,
            answerText,
            ownerUserId: args.input.ownerUserId ?? undefined,
            status: 'ACTIVE'
          },
          create: {
            tenantId: args.tenantId,
            normalizedQuestion: normalizeQuestion(questionText),
            questionText,
            answerText,
            scope,
            ownerUserId: args.input.ownerUserId ?? null,
            reviewerUserId: args.input.ownerUserId ?? null,
            createdBy: args.userId
          }
        });

        results.push({
          index,
          label: questionText,
          entityId: approvedAnswer.id,
          action: approvedAnswer.createdAt.getTime() === approvedAnswer.updatedAt.getTime() ? 'created' : 'updated'
        });
        continue;
      }

      const title = getValue(row, ['title', 'name']);
      const description = getValue(row, ['description', 'details']) || title;

      if (!title) {
        throw new Error('Missing incident title');
      }

      const incidentType = parseIncidentType(getValue(row, ['incidentType', 'type']), args.input.incidentType ?? 'OTHER');
      const severity = parseIncidentSeverity(
        getValue(row, ['severity']),
        args.input.incidentSeverity ?? 'MEDIUM'
      );
      const importedStatus = parseIncidentStatus(getValue(row, ['status']));

      const created = await createIncidentRecord({
        tenantId: args.tenantId,
        userId: args.userId,
        input: {
          title,
          description,
          incidentType,
          severity,
          detectionSource: getValue(row, ['detectionSource', 'source']) || null,
          incidentOwnerUserId: args.input.ownerUserId ?? null,
          guidedStart: false,
          launchRunbookPack: false
        }
      });

      if (importedStatus !== 'NEW') {
        await updateIncidentRecord({
          tenantId: args.tenantId,
          incidentId: created.incident.id,
          actorUserId: args.userId,
          input: {
            status: importedStatus
          }
        });
      }

      results.push({
        index,
        label: title,
        entityId: created.incident.id,
        action: 'created'
      });
    } catch (error) {
      results.push({
        index,
        label:
          getValue(row, ['title', 'name', 'questionText', 'question', 'prompt']) || `Row ${index + 1}`,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const createdRows = results.filter((result) => result.entityId);
  const failedRows = results.filter((result) => result.error);
  const status: AdoptionImportStatus =
    failedRows.length === 0 ? 'SUCCEEDED' : createdRows.length ? 'PARTIAL' : 'FAILED';
  const summary = summarizeImport({
    target: args.input.target,
    source: args.input.source,
    createdCount: createdRows.length,
    failedCount: failedRows.length
  });

  const record = await prisma.adoptionImport.create({
    data: {
      tenantId: args.tenantId,
      connectorId: connector?.id ?? null,
      target: args.input.target,
      source: args.input.source,
      status,
      sourceLabel: args.input.sourceLabel ?? connector?.name ?? null,
      summary,
      rawInput: toJsonValue({
        content: args.input.content,
        ownerUserId: args.input.ownerUserId ?? null,
        approvedAnswerScope: args.input.approvedAnswerScope ?? null,
        incidentType: args.input.incidentType ?? null,
        incidentSeverity: args.input.incidentSeverity ?? null
      }),
      resultJson: toJsonValue({
        rows: results
      }),
      createdCount: createdRows.length,
      failedCount: failedRows.length,
      createdBy: args.userId
    },
    include: {
      connector: {
        select: {
          id: true,
          name: true,
          provider: true
        }
      }
    }
  });

  return {
    record,
    results
  };
}
