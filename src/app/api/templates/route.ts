import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { templateCreateSchema } from '@/lib/validation/template';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError } from '@/lib/http';
import { getTenantEntitlements } from '@/lib/billing/entitlements';

export async function GET() {
  try {
    const session = await getSessionContext();
    const templates = await prisma.template.findMany({
      where: { tenantId: session.tenantId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(templates);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = templateCreateSchema.parse(await request.json());

    const entitlements = await getTenantEntitlements(session.tenantId);
    const templateCount = await prisma.template.count({ where: { tenantId: session.tenantId } });
    if (templateCount >= entitlements.limits.maxTemplates) {
      return NextResponse.json({ error: 'Template limit reached for current subscription plan' }, { status: 402 });
    }

    const existing = await prisma.template.findFirst({
      where: { tenantId: session.tenantId, name: payload.name }
    });
    if (existing) {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 409 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const template = await tx.template.create({
        data: {
          tenantId: session.tenantId,
          name: payload.name,
          description: payload.description,
          createdBy: session.userId
        }
      });

      const version = await tx.templateVersion.create({
        data: {
          tenantId: session.tenantId,
          templateId: template.id,
          version: 1,
          title: payload.versionTitle
        }
      });

      await tx.template.update({ where: { id: template.id }, data: { currentVersionId: version.id } });

      const sectionIdByTitle = new Map<string, string>();

      for (let controlIndex = 0; controlIndex < payload.controls.length; controlIndex += 1) {
        const control = payload.controls[controlIndex];
        const sectionTitle = control.sectionTitle ?? control.domain;

        if (!sectionIdByTitle.has(sectionTitle)) {
          const section = await tx.templateSection.create({
            data: {
              tenantId: session.tenantId,
              templateVersionId: version.id,
              title: sectionTitle,
              order: sectionIdByTitle.size
            }
          });
          sectionIdByTitle.set(sectionTitle, section.id);
        }

        const createdControl = await tx.control.create({
          data: {
            tenantId: session.tenantId,
            templateVersionId: version.id,
            domain: control.domain,
            code: control.code,
            title: control.title,
            weight: control.weight
          }
        });

        for (let questionIndex = 0; questionIndex < control.questions.length; questionIndex += 1) {
          const question = control.questions[questionIndex];
          await tx.question.create({
            data: {
              tenantId: session.tenantId,
              controlId: createdControl.id,
              sectionId: sectionIdByTitle.get(sectionTitle),
              prompt: question.prompt,
              guidance: question.guidance,
              answerType: question.answerType,
              rubric: question.rubric,
              scoringRubricJson:
                question.scoringRubricJson === undefined
                  ? undefined
                  : (JSON.parse(JSON.stringify(question.scoringRubricJson)) as Prisma.InputJsonValue),
              order: question.order ?? questionIndex,
              weight: question.weight
            }
          });
        }
      }

      return template;
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'template',
      entityId: created.id,
      action: 'create',
      metadata: { name: payload.name }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

