import { QuestionnaireUploadStatus, type TrustPacketShareMode, type TrustPacketStatus } from '@prisma/client';

type ApprovedDraftRow = {
  rowKey: string;
  questionText: string;
  answerText: string;
  confidenceScore: number;
  supportingEvidenceIds: string[];
  mappedControlIds: string[];
};

type TrustDocInput = {
  id: string;
  category: string;
  evidenceId: string;
  createdAt: Date;
  evidence: {
    id: string;
    name: string;
    createdAt: Date;
  };
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

export function deriveQuestionnaireUploadStatus(statuses: Array<{
  status: 'DRAFT' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';
}>, totalRows = statuses.length) {
  if (!statuses.length) return QuestionnaireUploadStatus.UPLOADED;
  if (statuses.some((entry) => entry.status === 'REJECTED' || entry.status === 'NEEDS_REVIEW')) {
    return QuestionnaireUploadStatus.NEEDS_REVIEW;
  }
  if (statuses.length < totalRows) {
    return QuestionnaireUploadStatus.DRAFTED;
  }
  if (statuses.every((entry) => entry.status === 'APPROVED')) {
    return QuestionnaireUploadStatus.APPROVED;
  }
  return QuestionnaireUploadStatus.DRAFTED;
}

export function buildTrustPacketRecord(args: {
  packetName: string;
  shareMode: TrustPacketShareMode;
  approvedRows: ApprovedDraftRow[];
  trustDocs: TrustDocInput[];
  includeAiGovernanceSummary?: boolean;
  organizationName?: string | null;
}) {
  const staleArtifactIds = args.trustDocs
    .filter((doc) => Date.now() - doc.evidence.createdAt.getTime() > 1000 * 60 * 60 * 24 * 180)
    .map((doc) => doc.evidenceId);
  const approvedEvidenceIds = uniqueStrings(args.approvedRows.flatMap((row) => row.supportingEvidenceIds));
  const approvedTrustDocIds = args.trustDocs
    .filter((doc) => !staleArtifactIds.includes(doc.evidenceId))
    .map((doc) => doc.evidenceId);
  const includedArtifactIds = uniqueStrings([
    ...approvedEvidenceIds,
    ...approvedTrustDocIds
  ]);
  const excludedArtifactIds = args.trustDocs
    .filter((doc) => staleArtifactIds.includes(doc.evidenceId))
    .map((doc) => doc.evidenceId);
  const packetSections = [
    {
      id: 'capability-statement',
      title: 'Capability Statement',
      description: `Security operating summary for ${args.organizationName ?? 'the tenant workspace'}.`
    },
    {
      id: 'approved-questionnaire-responses',
      title: 'Approved Questionnaire Responses',
      description: `${args.approvedRows.length} approved questionnaire answers ready for buyer review.`
    },
    {
      id: 'evidence-map',
      title: 'Evidence Map',
      description: `${approvedEvidenceIds.length} evidence artifact(s) linked to approved responses.`
    },
    {
      id: 'policy-summaries',
      title: 'Approved Policy Summaries',
      description: `${args.trustDocs.length} trust document(s) registered in the vault.`
    },
    ...(args.includeAiGovernanceSummary
      ? [
          {
            id: 'ai-governance-summary',
            title: 'AI Governance Summary',
            description: 'AI governance posture summary included for customer diligence.'
          }
        ]
      : [])
  ];
  const reviewerRequired = staleArtifactIds.length > 0 || args.shareMode === 'INTERNAL_REVIEW';
  const status: TrustPacketStatus = reviewerRequired ? 'READY_FOR_REVIEW' : 'READY_TO_SHARE';

  return {
    name: args.packetName,
    status,
    shareMode: args.shareMode,
    packetSections,
    includedArtifactIds,
    excludedArtifactIds,
    staleArtifactIds,
    reviewerRequired
  };
}
