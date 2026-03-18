import { notFound } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { BoardBriefDetailPanel } from '@/components/app/board-brief-detail-panel';

export default async function BoardBriefDetailPage({ params }: { params: { id: string } }) {
  const session = await getPageSessionContext();
  const brief = await prisma.boardBrief.findFirst({
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

  if (!brief) {
    notFound();
  }

  const risks = await prisma.riskRegisterItem.findMany({
    where: {
      tenantId: session.tenantId,
      id: { in: brief.topRiskIds }
    }
  });

  return (
    <BoardBriefDetailPanel
      brief={{
        ...brief,
        reviewerNotes: brief.reviewerNotes ?? null,
        risks
      }}
    />
  );
}
