import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionContext } from '@/lib/auth/session';
import { badRequest, handleRouteError } from '@/lib/http';

const payloadSchema = z.object({
  tenantId: z.string().min(1)
});

const ACTIVE_TENANT_COOKIE = 'vantage_active_tenant';

export async function PATCH(request: Request) {
  try {
    const session = await getSessionContext();
    const payload = payloadSchema.parse(await request.json());

    const membership = session.memberships.find((item) => item.tenantId === payload.tenantId);
    if (!membership) {
      return badRequest('Requested tenant is not in active memberships');
    }

    cookies().set({
      name: ACTIVE_TENANT_COOKIE,
      value: membership.tenantId,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30
    });

    return NextResponse.json({
      tenantId: membership.tenantId,
      tenantSlug: membership.tenantSlug,
      tenantName: membership.tenantName,
      role: membership.role
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
