import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { MembershipStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { tenantCreateSchema } from '@/lib/validation/tenant';
import { handleRouteError, unauthorized } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

async function findAvailableSlug(baseSlug: string) {
  let slug = baseSlug || `workspace-${Date.now()}`;
  let suffix = 1;

  while (true) {
    const exists = await prisma.tenant.findUnique({ where: { slug } });
    if (!exists) return slug;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();

    const payload = tenantCreateSchema.parse(await request.json());
    const rawSlug = payload.slug ?? slugify(payload.name);
    const slug = await findAvailableSlug(rawSlug);

    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {
        name: session.user.name ?? undefined
      },
      create: {
        email: session.user.email,
        name: session.user.name ?? null,
        emailVerified: new Date()
      }
    });

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: payload.name,
          slug
        }
      });

      const membership = await tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'OWNER',
          status: MembershipStatus.ACTIVE
        }
      });

      await tx.tenantBranding.create({
        data: {
          tenantId: tenant.id,
          companyName: payload.name
        }
      });

      return { tenant, membership };
    });

    await writeAuditLog({
      tenantId: created.tenant.id,
      actorUserId: user.id,
      entityType: 'tenant',
      entityId: created.tenant.id,
      action: 'create',
      metadata: {
        slug: created.tenant.slug,
        membershipRole: created.membership.role
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
