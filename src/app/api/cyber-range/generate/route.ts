import { NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { generateCyberRangePlan } from '@/lib/cyber-range/generate';
import { cyberRangeGenerationRequestSchema } from '@/lib/validation/cyber-range';

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');

    const payload = cyberRangeGenerationRequestSchema.parse(await request.json());
    const plan = generateCyberRangePlan(payload);

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'cyber_range',
      entityId: plan.planId,
      action: 'generate',
      metadata: {
        rangeName: payload.rangeName,
        environment: payload.environment,
        scale: payload.scale,
        fidelity: payload.fidelity,
        participants: payload.participants
      }
    });

    return NextResponse.json({ plan });
  } catch (error) {
    return handleRouteError(error);
  }
}
