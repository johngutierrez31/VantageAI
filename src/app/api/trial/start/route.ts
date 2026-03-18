import { NextResponse } from 'next/server';
import { handleRouteError, badRequest } from '@/lib/http';
import { findUserWithActiveMemberships, provisionWorkspace } from '@/lib/tenants/provision';
import { trialStartSchema } from '@/lib/validation/trial';

export async function POST(request: Request) {
  try {
    const payload = trialStartSchema.parse(await request.json());
    const existingUser = await findUserWithActiveMemberships(payload.email);

    if (existingUser?.memberships.length) {
      return badRequest('This email already belongs to an active workspace. Sign in instead of starting a new trial.');
    }

    const created = await provisionWorkspace({
      name: payload.workspaceName,
      slug: payload.slug,
      ownerEmail: payload.email,
      ownerName: payload.name,
      mode: 'TRIAL',
      trialDays: 14
    });

    return NextResponse.json(
      {
        tenant: {
          id: created.tenant.id,
          name: created.tenant.name,
          slug: created.tenant.slug,
          workspaceMode: created.tenant.workspaceMode,
          trialEndsAt: created.tenant.trialEndsAt
        },
        owner: {
          email: created.user.email,
          name: created.user.name
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
