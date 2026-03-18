import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import { handleRouteError } from '@/lib/http';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export async function GET() {
  try {
    const session = await getSessionContext();

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId: session.tenantId },
      orderBy: { updatedAt: 'desc' }
    });

    const [entitlements, workspace] = await Promise.all([
      getTenantEntitlements(session.tenantId),
      getTenantWorkspaceContext(session.tenantId)
    ]);

    return NextResponse.json({
      subscription,
      entitlements,
      workspace
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
