import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { handleRouteError, notFound } from '@/lib/http';

export async function POST(_: Request, { params }: { params: { templateId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ADMIN');

    const template = await prisma.template.findFirst({
      where: { id: params.templateId, tenantId: session.tenantId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
    });
    if (!template || !template.versions[0]) return notFound('Template/version not found');

    await prisma.$transaction([
      prisma.templateVersion.update({ where: { id: template.versions[0].id }, data: { isPublished: true } }),
      prisma.template.update({
        where: { id: template.id },
        data: { status: 'PUBLISHED', currentVersionId: template.versions[0].id }
      })
    ]);

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'template',
      entityId: template.id,
      action: 'publish',
      metadata: { versionId: template.versions[0].id }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { templateId: string } }) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ADMIN');

    const template = await prisma.template.findFirst({
      where: { id: params.templateId, tenantId: session.tenantId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
    });
    if (!template || !template.versions[0]) return notFound('Template/version not found');

    await prisma.$transaction([
      prisma.templateVersion.update({
        where: { id: template.versions[0].id },
        data: { isPublished: false }
      }),
      prisma.template.update({
        where: { id: template.id },
        data: { status: 'DRAFT' }
      })
    ]);

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'template',
      entityId: template.id,
      action: 'unpublish',
      metadata: { versionId: template.versions[0].id }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
