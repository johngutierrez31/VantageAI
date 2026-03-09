import { notFound } from 'next/navigation';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { listTenantReviewers } from '@/lib/trust/reviewers';
import { EvidenceMapDetailPanel } from '@/components/app/evidence-map-detail-panel';

export default async function EvidenceMapDetailPage({ params }: { params: { id: string } }) {
  const session = await getPageSessionContext();
  const [evidenceMap, reviewers] = await Promise.all([
    prisma.evidenceMap.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId
      },
      include: {
        questionnaireUpload: {
          select: {
            id: true,
            filename: true,
            organizationName: true
          }
        },
        items: {
          orderBy: { createdAt: 'asc' }
        }
      }
    }),
    listTenantReviewers(session.tenantId)
  ]);

  if (!evidenceMap) notFound();

  return (
    <EvidenceMapDetailPanel
      evidenceMap={{
        id: evidenceMap.id,
        name: evidenceMap.name,
        status: evidenceMap.status,
        assignedReviewerUserId: evidenceMap.assignedReviewerUserId,
        reviewDueAt: evidenceMap.reviewDueAt?.toISOString() ?? null,
        reviewerNotes: evidenceMap.reviewerNotes,
        questionnaireUploadId: evidenceMap.questionnaireUploadId,
        questionnaireLabel:
          evidenceMap.questionnaireUpload.organizationName ?? evidenceMap.questionnaireUpload.filename,
        items: evidenceMap.items.map((item) => ({
          id: item.id,
          questionCluster: item.questionCluster,
          supportStrength: item.supportStrength,
          buyerSafeSummary: item.buyerSafeSummary,
          recommendedNextAction: item.recommendedNextAction,
          relatedControlIds: item.relatedControlIds,
          evidenceArtifactIds: item.evidenceArtifactIds,
          ownerIds: item.ownerIds,
          relatedTaskId: item.relatedTaskId,
          relatedFindingId: item.relatedFindingId
        }))
      }}
      reviewers={reviewers.map((reviewer) => ({
        id: reviewer.userId,
        label: reviewer.user.name ?? reviewer.user.email
      }))}
    />
  );
}
