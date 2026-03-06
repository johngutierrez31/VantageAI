import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { buildSevenDayMissionQueue, getTenantSecurityPulse } from '@/lib/intel/pulse';
import { getTrendSignals } from '@/lib/intel/trends';

export async function GET() {
  try {
    const session = await getSessionContext();
    const pulse = await getTenantSecurityPulse(session.tenantId);
    const trends = getTrendSignals();
    const missionQueue = buildSevenDayMissionQueue(pulse, trends);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      pulse,
      missionQueue
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

