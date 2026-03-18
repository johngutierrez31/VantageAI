import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/options';
import { tenantCreateSchema } from '@/lib/validation/tenant';
import { handleRouteError, unauthorized } from '@/lib/http';
import { provisionWorkspace } from '@/lib/tenants/provision';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();

    const payload = tenantCreateSchema.parse(await request.json());
    const created = await provisionWorkspace({
      name: payload.name,
      slug: payload.slug,
      ownerEmail: session.user.email,
      ownerName: session.user.name ?? null,
      mode: 'PAID'
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
