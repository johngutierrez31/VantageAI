import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { getSoloCisoCapabilities, getTopTrendActions, getTrendSignals } from '@/lib/intel/trends';

export async function GET() {
  try {
    await getSessionContext();

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      trends: getTrendSignals(),
      capabilities: getSoloCisoCapabilities(),
      topActions: getTopTrendActions(12)
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

