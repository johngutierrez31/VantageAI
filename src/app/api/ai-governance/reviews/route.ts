import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { listAIGovernanceReviewItems } from '@/lib/ai-governance/records';

export async function GET() {
  try {
    const session = await getSessionContext();
    const items = await listAIGovernanceReviewItems(session.tenantId);
    return NextResponse.json(items);
  } catch (error) {
    return handleRouteError(error);
  }
}
