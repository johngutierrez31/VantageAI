import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError, notFound } from '@/lib/http';

export async function POST(_: Request, { params }: { params: { templateId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ANALYST');

    const source = await prisma.template.findFirst({
      where: { id: params.templateId, tenantId: session.tenantId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            controls: {
              include: { questions: true }
            }
          }
        }
      }
    });

    if (!source || !source.versions[0]) return notFound('Template not found');

    const latestVersion = source.versions[0];
    const baseName = `${source.name} Copy`;

    const existingWithName = await prisma.template.count({
      where: { tenantId: session.tenantId, name: { startsWith: baseName } }
    });
    const duplicateName = existingWithName > 0 ? `${baseName} ${existingWithName + 1}` : baseName;

    const duplicated = await prisma.$transaction(async (tx) => {
      const template = await tx.template.create({
        data: {
          tenantId: session.tenantId,
          name: duplicateName,
          description: source.description ?? `Duplicated from ${source.name}`,
          status: 'DRAFT',
          createdBy: session.userId
        }
      });

      const version = await tx.templateVersion.create({
        data: {
          tenantId: session.tenantId,
          templateId: template.id,
          version: 1,
          title: `${latestVersion.title} (Copy)`,
          notes: `Duplicated from template ${source.id}`,
          isPublished: false
        }
      });

      await tx.template.update({
        where: { id: template.id },
        data: { currentVersionId: version.id }
      });

      for (const control of latestVersion.controls) {
        const createdControl = await tx.control.create({
          data: {
            tenantId: session.tenantId,
            templateVersionId: version.id,
            domain: control.domain,
            code: `${control.code}-COPY`,
            title: control.title,
            description: control.description,
            weight: control.weight
          }
        });

        for (const question of control.questions) {
          await tx.question.create({
            data: {
              tenantId: session.tenantId,
              controlId: createdControl.id,
              prompt: question.prompt,
              rubric: question.rubric,
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
      entityId: duplicated.id,
      action: 'duplicate',
      metadata: {
        sourceTemplateId: source.id
      }
    });

    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
