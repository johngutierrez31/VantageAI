import { prisma } from '@/lib/db/prisma';

export async function listTenantReviewers(tenantId: string) {
  return prisma.membership.findMany({
    where: {
      tenantId,
      status: 'ACTIVE'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }]
  });
}

export async function assertTenantReviewer(tenantId: string, userId: string | null | undefined) {
  if (!userId) return null;

  const membership = await prisma.membership.findFirst({
    where: {
      tenantId,
      userId,
      status: 'ACTIVE'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!membership) {
    throw new Error('INVALID_REVIEWER');
  }

  return membership;
}
