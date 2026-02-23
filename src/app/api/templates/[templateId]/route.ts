import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { templateVersionCreateSchema } from '@/lib/validation/template';
import { handleRouteError, notFound } from '@/lib/http';

export async function GET(_: Request, { params }: { params: { templateId: string } }) {
  try {
    const session = await getSessionContext();
    const template = await prisma.template.findFirst({
      where: { id: params.templateId, tenantId: session.tenantId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          include: { controls: { include: { questions: true } } }
        }
      }
    });

    if (!template) return notFound('Template not found');
    return NextResponse.json(template);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { templateId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = templateVersionCreateSchema.parse(await request.json());

    const template = await prisma.template.findFirst({
      where: { id: params.templateId, tenantId: session.tenantId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
    });
    if (!template) return notFound('Template not found');

    const latestVersion = template.versions[0]?.version ?? 0;

    const createdVersion = await prisma.$transaction(async (tx) => {
      const version = await tx.templateVersion.create({
        data: {
          tenantId: session.tenantId,
          templateId: template.id,
          version: latestVersion + 1,
          title: payload.title,
          notes: payload.notes,
          isPublished: false
        }
      });

      for (const control of payload.controls) {
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

      await tx.template.update({ where: { id: template.id }, data: { status: 'DRAFT' } });

      return version;
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'template',
      entityId: template.id,
      action: 'new_version',
      metadata: { versionId: createdVersion.id, version: createdVersion.version }
    });

    return NextResponse.json(createdVersion, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { templateId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ADMIN');

    const found = await prisma.template.findFirst({ where: { id: params.templateId, tenantId: session.tenantId } });
    if (!found) return notFound('Template not found');

    await prisma.template.delete({ where: { id: params.templateId } });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'template',
      entityId: params.templateId,
      action: 'delete'
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
