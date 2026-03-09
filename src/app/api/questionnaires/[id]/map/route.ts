import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { questionnaireMapSchema } from '@/lib/validation/questionnaire';
import { mapQuestionnaireRows, normalizeQuestionText } from '@/lib/questionnaire/mapping';
import { handleRouteError, notFound, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

type TargetQuestion = {
  id: string;
  prompt: string;
};

async function resolveTemplateQuestionTargets(args: {
  tenantId: string;
  templateId?: string;
  assessmentId?: string;
}): Promise<TargetQuestion[]> {
  if (args.assessmentId) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: args.assessmentId, tenantId: args.tenantId },
      select: { templateVersionId: true }
    });
    if (!assessment) return [];
    return prisma.question.findMany({
      where: {
        tenantId: args.tenantId,
        control: { templateVersionId: assessment.templateVersionId }
      },
      select: { id: true, prompt: true }
    });
  }

  if (args.templateId) {
    const template = await prisma.template.findFirst({
      where: { id: args.templateId, tenantId: args.tenantId },
      select: { currentVersionId: true }
    });
    if (!template?.currentVersionId) return [];
    return prisma.question.findMany({
      where: {
        tenantId: args.tenantId,
        control: { templateVersionId: template.currentVersionId }
      },
      select: { id: true, prompt: true }
    });
  }

  return prisma.question.findMany({
    where: { tenantId: args.tenantId },
    select: { id: true, prompt: true },
    take: 1500
  });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = questionnaireMapSchema.parse(await request.json());

    const upload = await prisma.questionnaireUpload.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        items: {
          orderBy: { rowOrder: 'asc' }
        }
      }
    });

    if (!upload) return notFound('Questionnaire upload not found');

    const targets = await resolveTemplateQuestionTargets({
      tenantId: session.tenantId,
      templateId: payload.templateId,
      assessmentId: payload.assessmentId
    });

    if (!targets.length) {
      return badRequest('No template questions available for mapping');
    }

    const mappings = mapQuestionnaireRows(
      upload.items.map((item) => ({
        question: item.questionText
      })),
      targets
    );

    await prisma.$transaction(async (tx) => {
      await tx.questionnaireUpload.update({
        where: { id: upload.id },
        data: {
          status: 'MAPPED'
        }
      });

      await tx.questionnaireMapping.deleteMany({
        where: {
          tenantId: session.tenantId,
          questionnaireItemId: { in: upload.items.map((item) => item.id) }
        }
      });

      for (let index = 0; index < upload.items.length; index += 1) {
        const item = upload.items[index];
        const mapping = mappings[index];

        await tx.questionnaireItem.update({
          where: { id: item.id },
          data: {
            normalizedQuestion: mapping.normalizedQuestion || normalizeQuestionText(item.questionText)
          }
        });

        await tx.questionnaireMapping.create({
          data: {
            tenantId: session.tenantId,
            questionnaireItemId: item.id,
            templateQuestionId: mapping.mappedQuestionId,
            confidence: mapping.matchScore,
            status: mapping.mappedQuestionId ? 'MAPPED' : 'UNMAPPED'
          }
        });
      }
    });

    const result = await prisma.questionnaireItem.findMany({
      where: { questionnaireUploadId: upload.id, tenantId: session.tenantId },
      include: {
        mappings: {
          include: {
            templateQuestion: {
              select: {
                id: true,
                prompt: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { rowOrder: 'asc' }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'questionnaire_upload',
      entityId: upload.id,
      action: 'map',
      metadata: {
        targetCount: targets.length,
        mappedCount: result.filter((item) => item.mappings[0]?.status === 'MAPPED').length
      }
    });

    return NextResponse.json({
      questionnaireId: upload.id,
      items: result.map((item) => ({
        itemId: item.id,
        rowKey: item.rowKey,
        questionText: item.questionText,
        mapping: item.mappings[0]
          ? {
              status: item.mappings[0].status,
              confidence: item.mappings[0].confidence,
              templateQuestionId: item.mappings[0].templateQuestionId,
              mappedPrompt: item.mappings[0].templateQuestion?.prompt ?? null
            }
          : null
      }))
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
