import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { questionnaireCommitSchema } from '@/lib/validation/questionnaire';
import { requireQuestionnaireImportAccess } from '@/lib/billing/entitlements';
import { handleRouteError, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

function clampScore(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(4, value));
}

function clampConfidence(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.7;
  return Math.max(0, Math.min(1, value));
}

export async function POST(request: Request, { params }: { params: { assessmentId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ANALYST');
    await requireQuestionnaireImportAccess(session.tenantId);

    const payload = questionnaireCommitSchema.parse(await request.json());

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.assessmentId, tenantId: session.tenantId }
    });
    if (!assessment) return notFound('Assessment not found');

    const importRecord = await prisma.questionnaireImport.findFirst({
      where: {
        id: payload.importId,
        assessmentId: assessment.id,
        tenantId: session.tenantId
      },
      include: { rows: true }
    });

    if (!importRecord) return notFound('Questionnaire import not found');

    const overrideMap = new Map(
      (payload.overrides ?? []).map((override) => [override.rowId, override])
    );

    let appliedCount = 0;
    let skippedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of importRecord.rows) {
        const override = overrideMap.get(row.id);
        const mappedQuestionId = override?.mappedQuestionId ?? row.mappedQuestionId;

        if (!mappedQuestionId) {
          skippedCount += 1;
          continue;
        }

        const question = await tx.question.findFirst({
          where: {
            id: mappedQuestionId,
            tenantId: session.tenantId,
            control: { templateVersionId: assessment.templateVersionId }
          }
        });

        if (!question) {
          skippedCount += 1;
          continue;
        }

        const response = await tx.response.upsert({
          where: {
            assessmentId_questionId: {
              assessmentId: assessment.id,
              questionId: mappedQuestionId
            }
          },
          update: {
            answer: row.sourceAnswer,
            score: clampScore(override?.score ?? row.sourceScore),
            confidence: clampConfidence(override?.confidence ?? row.sourceConfidence),
            rationale: 'Imported from questionnaire mapping workflow.',
            updatedBy: session.userId
          },
          create: {
            tenantId: session.tenantId,
            assessmentId: assessment.id,
            questionId: mappedQuestionId,
            answer: row.sourceAnswer,
            score: clampScore(override?.score ?? row.sourceScore),
            confidence: clampConfidence(override?.confidence ?? row.sourceConfidence),
            rationale: 'Imported from questionnaire mapping workflow.',
            updatedBy: session.userId
          }
        });

        await tx.questionnaireImportRow.update({
          where: { id: row.id },
          data: {
            mappedQuestionId,
            responseId: response.id,
            sourceScore: override?.score ?? row.sourceScore,
            sourceConfidence: override?.confidence ?? row.sourceConfidence
          }
        });

        appliedCount += 1;
      }

      await tx.questionnaireImport.update({
        where: { id: importRecord.id },
        data: {
          status: 'APPLIED',
          appliedAt: new Date(),
          failureReason: null
        }
      });
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'questionnaire_import',
      entityId: importRecord.id,
      action: 'apply',
      metadata: {
        assessmentId: assessment.id,
        appliedCount,
        skippedCount
      }
    });

    return NextResponse.json({
      importId: importRecord.id,
      appliedCount,
      skippedCount,
      status: 'APPLIED'
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
