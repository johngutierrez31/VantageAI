import { notFound } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { QuarterlyReviewDetailPanel } from '@/components/app/quarterly-review-detail-panel';

export default async function QuarterlyReviewDetailPage({ params }: { params: { id: string } }) {
  const session = await getPageSessionContext();
  const review = await prisma.quarterlyReview.findFirst({
    where: {
      tenantId: session.tenantId,
      id: params.id
    },
    include: {
      snapshot: {
        select: {
          overallScore: true,
          overallDelta: true
        }
      },
      boardBrief: {
        select: {
          id: true,
          title: true,
          status: true
        }
      },
      roadmap: {
        select: {
          id: true,
          name: true,
          status: true
        }
      }
    }
  });

  if (!review) {
    notFound();
  }

  const risks = review.topRiskIds.length
    ? await prisma.riskRegisterItem.findMany({
        where: {
          tenantId: session.tenantId,
          id: { in: review.topRiskIds }
        }
      })
    : [];

  return (
    <QuarterlyReviewDetailPanel
      review={{
        ...review,
        reviewDate: review.reviewDate.toISOString(),
        notes: review.notes ?? null,
        risks
      }}
    />
  );
}
