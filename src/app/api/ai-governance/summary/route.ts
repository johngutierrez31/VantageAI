import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { getAIGovernanceSummary } from '@/lib/ai-governance/summary';

export async function GET() {
  try {
    const session = await getSessionContext();
    const summary = await getAIGovernanceSummary(session.tenantId);
    return NextResponse.json(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
