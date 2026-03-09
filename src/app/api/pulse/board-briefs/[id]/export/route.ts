import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';
import { buildSuiteExportBaseName } from '@/lib/export/file-names';
import {
  buildBoardBriefExportPayload,
  renderBoardBriefHtml,
  renderBoardBriefMarkdown
} from '@/lib/pulse/export';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionContext();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'html';

    const brief = await prisma.boardBrief.findFirstOrThrow({
      where: {
        tenantId: session.tenantId,
        id: params.id
      },
      include: {
        snapshot: {
          select: {
            reportingPeriod: true,
            overallScore: true,
            overallDelta: true
          }
        },
        roadmap: {
          select: {
            name: true,
            status: true
          }
        }
      }
    });

    if (brief.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Board brief must be approved before export.' },
        { status: 409 }
      );
    }

    const risks = await prisma.riskRegisterItem.findMany({
      where: {
        tenantId: session.tenantId,
        id: { in: brief.topRiskIds }
      }
    });

    const payload = buildBoardBriefExportPayload(brief, risks);
    const fileBase = buildSuiteExportBaseName('board-brief', brief.title, brief.reportingPeriod);

    let body: string;
    let contentType: string;
    let extension: string;

    if (format === 'json') {
      body = `${JSON.stringify(payload, null, 2)}\n`;
      contentType = 'application/json';
      extension = 'json';
    } else if (format === 'markdown') {
      body = renderBoardBriefMarkdown(brief, risks);
      contentType = 'text/markdown; charset=utf-8';
      extension = 'md';
    } else {
      body = renderBoardBriefHtml(brief, risks);
      contentType = 'text/html; charset=utf-8';
      extension = 'html';
    }

    await prisma.boardBrief.update({
      where: { id: brief.id },
      data: {
        lastExportedAt: new Date(),
        exportCount: { increment: 1 }
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'board_brief',
      entityId: brief.id,
      action: 'board_brief_exported',
      metadata: {
        format
      }
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileBase}.${extension}"`
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
