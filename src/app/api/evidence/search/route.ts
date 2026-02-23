import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { evidenceSearchSchema } from '@/lib/validation/evidence';
import { searchEvidenceChunks } from '@/lib/evidence/search';
import { handleRouteError } from '@/lib/http';

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    const payload = evidenceSearchSchema.parse(await request.json());
    const results = await searchEvidenceChunks(session.tenantId, payload.query, payload.limit ?? 8);

    return NextResponse.json({
      query: payload.query,
      results
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
