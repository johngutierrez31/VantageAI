import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { workflowRoutes } from '@/lib/product/workflow-routes';
import { listTenantReviewers } from '@/lib/trust/reviewers';
import { TrustReviewQueuePanel } from '@/components/app/trust-review-queue-panel';

export default async function TrustReviewQueuePage() {
  const session = await getPageSessionContext();
  const [reviewers, questionnaires, evidenceMaps, trustPackets] = await Promise.all([
    listTenantReviewers(session.tenantId),
    prisma.questionnaireUpload.findMany({
      where: {
        tenantId: session.tenantId,
        status: {
          in: ['MAPPED', 'DRAFTED', 'NEEDS_REVIEW', 'APPROVED']
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    }),
    prisma.evidenceMap.findMany({
      where: {
        tenantId: session.tenantId,
        status: {
          in: ['DRAFT', 'NEEDS_REVIEW', 'APPROVED']
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    }),
    prisma.trustPacket.findMany({
      where: {
        tenantId: session.tenantId,
        status: {
          in: ['DRAFT', 'READY_FOR_REVIEW', 'READY_TO_SHARE']
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    })
  ]);

  const reviewerLabels = new Map(
    reviewers.map((reviewer) => [reviewer.userId, reviewer.user.name ?? reviewer.user.email])
  );

  return (
    <TrustReviewQueuePanel
      items={[
        ...questionnaires.map((item) => ({
          id: item.id,
          type: 'QUESTIONNAIRE' as const,
          title: item.organizationName ? `${item.organizationName} questionnaire` : item.filename,
          status: item.status,
          assignedReviewerUserId: item.assignedReviewerUserId,
          assignedReviewerLabel: item.assignedReviewerUserId ? reviewerLabels.get(item.assignedReviewerUserId) ?? null : null,
          reviewDueAt: item.reviewDueAt?.toISOString() ?? null,
          href: workflowRoutes.questionnaireReview(item.id)
        })),
        ...evidenceMaps.map((item) => ({
          id: item.id,
          type: 'EVIDENCE_MAP' as const,
          title: item.name,
          status: item.status,
          assignedReviewerUserId: item.assignedReviewerUserId,
          assignedReviewerLabel: item.assignedReviewerUserId ? reviewerLabels.get(item.assignedReviewerUserId) ?? null : null,
          reviewDueAt: item.reviewDueAt?.toISOString() ?? null,
          href: `/app/trust/evidence-maps/${item.id}`
        })),
        ...trustPackets.map((item) => ({
          id: item.id,
          type: 'TRUST_PACKET' as const,
          title: item.name,
          status: item.status,
          assignedReviewerUserId: item.assignedReviewerUserId,
          assignedReviewerLabel: item.assignedReviewerUserId ? reviewerLabels.get(item.assignedReviewerUserId) ?? null : null,
          reviewDueAt: item.reviewDueAt?.toISOString() ?? null,
          href: workflowRoutes.trustPacketAssembly(item.id)
        }))
      ]}
      reviewers={reviewers.map((reviewer) => ({
        id: reviewer.userId,
        label: reviewer.user.name ?? reviewer.user.email
      }))}
    />
  );
}
