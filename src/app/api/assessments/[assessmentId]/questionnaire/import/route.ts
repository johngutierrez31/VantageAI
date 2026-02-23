import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { questionnaireImportSchema } from '@/lib/validation/questionnaire';
import { parseQuestionnaireImport } from '@/lib/questionnaire/parser';
import { mapQuestionnaireRows } from '@/lib/questionnaire/mapping';
import { requireQuestionnaireImportAccess } from '@/lib/billing/entitlements';
import { handleRouteError, badRequest, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: Request, { params }: { params: { assessmentId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    await requireQuestionnaireImportAccess(session.tenantId);

    const payload = questionnaireImportSchema.parse(await request.json());

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.assessmentId, tenantId: session.tenantId }
    });
    if (!assessment) return notFound('Assessment not found');

    const parsedRows = parseQuestionnaireImport(payload.format, payload.content);
    if (!parsedRows.length) {
      return badRequest('No questionnaire rows were parsed');
    }

    const questions = await prisma.question.findMany({
      where: {
        tenantId: session.tenantId,
        control: { templateVersionId: assessment.templateVersionId }
      },
      select: { id: true, prompt: true }
    });

    const mappings = mapQuestionnaireRows(parsedRows, questions);

    const createdImport = await prisma.questionnaireImport.create({
      data: {
        tenantId: session.tenantId,
        assessmentId: assessment.id,
        sourceType: payload.format === 'json' ? 'JSON' : 'CSV',
        rawPayload: {
          format: payload.format,
          rowCount: parsedRows.length
        },
        createdBy: session.userId,
        rows: {
          create: mappings.map((mapping) => ({
            tenantId: session.tenantId,
            sourceQuestion: mapping.sourceQuestion,
            sourceAnswer: mapping.sourceAnswer,
            sourceScore: mapping.sourceScore,
            sourceConfidence: mapping.sourceConfidence,
            mappedQuestionId: mapping.mappedQuestionId,
            matchScore: mapping.matchScore
          }))
        }
      },
      include: {
        rows: {
          include: {
            mappedQuestion: {
              select: {
                id: true,
                prompt: true
              }
            }
          }
        }
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'questionnaire_import',
      entityId: createdImport.id,
      action: 'create',
      metadata: {
        assessmentId: assessment.id,
        sourceType: createdImport.sourceType,
        rowCount: createdImport.rows.length
      }
    });

    return NextResponse.json({
      importId: createdImport.id,
      status: createdImport.status,
      rows: createdImport.rows.map((row) => ({
        rowId: row.id,
        sourceQuestion: row.sourceQuestion,
        sourceAnswer: row.sourceAnswer,
        sourceScore: row.sourceScore,
        sourceConfidence: row.sourceConfidence,
        mappedQuestionId: row.mappedQuestionId,
        mappedPrompt: row.mappedQuestion?.prompt ?? null,
        matchScore: row.matchScore
      }))
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
