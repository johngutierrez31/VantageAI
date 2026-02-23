import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { parseCsvQuestionnaire, parseJsonQuestionnaire } from '@/lib/questionnaire/parser';
import { requireRole } from '@/lib/rbac/authorize';
import { getTenantEntitlements, requireQuestionnaireImportAccess } from '@/lib/billing/entitlements';
import { handleRouteError, badRequest, paymentRequired } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

type ParsedUpload = {
  filename: string;
  format: 'CSV' | 'JSON';
  rows: Array<{ question: string; answer?: string; score?: number; confidence?: number }>;
};

async function parseUploadRequest(request: Request): Promise<ParsedUpload> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const fileEntry = formData.get('file');
    if (!(fileEntry instanceof File)) {
      throw new Error('file is required');
    }

    const text = Buffer.from(await fileEntry.arrayBuffer()).toString('utf8');
    const lowerName = fileEntry.name.toLowerCase();
    const format = lowerName.endsWith('.json') ? 'JSON' : 'CSV';
    const rows = format === 'JSON' ? parseJsonQuestionnaire(text) : parseCsvQuestionnaire(text);

    return {
      filename: fileEntry.name,
      format,
      rows
    };
  }

  const json = (await request.json()) as { filename?: string; format?: string; content?: string };
  if (!json.content || typeof json.content !== 'string') {
    throw new Error('content is required');
  }

  const format = json.format === 'json' ? 'JSON' : 'CSV';
  const rows = format === 'JSON' ? parseJsonQuestionnaire(json.content) : parseCsvQuestionnaire(json.content);
  return {
    filename: json.filename?.trim() || `questionnaire-${Date.now()}.${format === 'JSON' ? 'json' : 'csv'}`,
    format,
    rows
  };
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    await requireQuestionnaireImportAccess(session.tenantId);

    const parsed = await parseUploadRequest(request);
    if (!parsed.rows.length) {
      return badRequest('No questionnaire rows were parsed');
    }

    const entitlements = await getTenantEntitlements(session.tenantId);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyRuns = await prisma.questionnaireUpload.count({
      where: { tenantId: session.tenantId, createdAt: { gte: monthStart } }
    });
    if (monthlyRuns >= entitlements.limits.questionnaireRunsPerMonth) {
      return paymentRequired('Questionnaire monthly run limit reached for current plan');
    }

    const upload = await prisma.questionnaireUpload.create({
      data: {
        tenantId: session.tenantId,
        filename: parsed.filename,
        originalFormat: parsed.format,
        parsedJson: {
          rowCount: parsed.rows.length
        },
        createdBy: session.userId,
        items: {
          create: parsed.rows.map((row, index) => ({
            tenantId: session.tenantId,
            rowKey: `row-${index + 1}`,
            questionText: row.question,
            contextJson: {
              sourceAnswer: row.answer ?? null,
              sourceScore: row.score ?? null,
              sourceConfidence: row.confidence ?? null
            }
          }))
        }
      },
      include: {
        items: true
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'questionnaire_upload',
      entityId: upload.id,
      action: 'upload',
      metadata: {
        filename: upload.filename,
        rowCount: upload.items.length
      }
    });

    return NextResponse.json(
      {
        id: upload.id,
        filename: upload.filename,
        originalFormat: upload.originalFormat,
        itemCount: upload.items.length
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'file is required') {
      return badRequest(error.message);
    }
    if (error instanceof Error && error.message === 'content is required') {
      return badRequest(error.message);
    }
    return handleRouteError(error);
  }
}
