import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { buildSevenDayMissionQueue, getTenantSecurityPulse } from '@/lib/intel/pulse';
import { getTrendSignals } from '@/lib/intel/trends';
import { buildWeeklyBrief, renderWeeklyBriefHtml, renderWeeklyBriefMarkdown } from '@/lib/intel/brief';

export async function GET(request: Request) {
  try {
    const session = await getSessionContext();
    const url = new URL(request.url);
    const format = url.searchParams.get('format') ?? 'markdown';
    const forceDownload = url.searchParams.get('download') === 'true';

    const pulse = await getTenantSecurityPulse(session.tenantId);
    const trends = getTrendSignals();
    const missionQueue = buildSevenDayMissionQueue(pulse, trends);
    const brief = buildWeeklyBrief(pulse, trends, missionQueue);

    if (format === 'json') {
      return NextResponse.json(brief);
    }

    if (format === 'html') {
      const html = renderWeeklyBriefHtml(brief);
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...(forceDownload ? { 'Content-Disposition': 'attachment; filename="weekly-solo-ciso-brief.html"' } : {})
        }
      });
    }

    const markdown = renderWeeklyBriefMarkdown(brief);
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        ...(forceDownload ? { 'Content-Disposition': 'attachment; filename="weekly-solo-ciso-brief.md"' } : {})
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

