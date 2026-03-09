export type EvidenceMapDraftStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';
export type EvidenceMapSupportStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'MISSING';
export type EvidenceMapStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'APPROVED' | 'ARCHIVED';

export type EvidenceMapSourceItem = {
  questionnaireItemId: string;
  rowKey: string;
  questionText: string;
  normalizedQuestion: string | null;
  ownerIds?: string[];
  openTaskIds?: string[];
  openFindingIds?: string[];
  draft: {
    status: EvidenceMapDraftStatus;
    answerText: string;
    confidenceScore: number;
    mappedControlIds: string[];
    supportingEvidenceIds: string[];
  } | null;
};

export type EvidenceMapDraftItem = {
  questionnaireItemId: string;
  questionCluster: string;
  normalizedQuestion: string;
  relatedControlIds: string[];
  evidenceArtifactIds: string[];
  ownerIds: string[];
  supportStrength: EvidenceMapSupportStrength;
  buyerSafeSummary: string;
  recommendedNextAction: string;
  relatedTaskId: string | null;
  relatedFindingId: string | null;
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

function inferSupportStrength(group: EvidenceMapSourceItem[]): EvidenceMapSupportStrength {
  const approvedDrafts = group.map((item) => item.draft).filter(Boolean);
  const evidenceCount = uniqueStrings(approvedDrafts.flatMap((draft) => draft?.supportingEvidenceIds ?? [])).length;
  const strongestConfidence = Math.max(...approvedDrafts.map((draft) => draft?.confidenceScore ?? 0), 0);

  if (!approvedDrafts.length || evidenceCount === 0) return 'MISSING';
  if (strongestConfidence >= 0.9 && evidenceCount >= 2) return 'STRONG';
  if (strongestConfidence >= 0.8 && evidenceCount >= 1) return 'MODERATE';
  return 'WEAK';
}

function buildBuyerSafeSummary(group: EvidenceMapSourceItem[]) {
  const approved = group.find((item) => item.draft?.status === 'APPROVED' && item.draft.answerText.trim());
  if (approved?.draft?.answerText) return approved.draft.answerText;

  const latest = group.find((item) => item.draft?.answerText?.trim());
  if (latest?.draft?.answerText) {
    return `${latest.draft.answerText} Internal review required before external sharing.`;
  }

  return 'No buyer-safe answer is approved for this question cluster yet.';
}

function buildRecommendedNextAction(
  supportStrength: EvidenceMapSupportStrength,
  hasApprovedDraft: boolean,
  questionCluster: string
) {
  if (supportStrength === 'STRONG' && hasApprovedDraft) {
    return 'Ready to include in a buyer-facing trust packet after final review.';
  }

  if (supportStrength === 'MODERATE') {
    return 'Verify the current evidence set and tighten buyer-facing wording before external sharing.';
  }

  if (supportStrength === 'WEAK') {
    return `Strengthen support for "${questionCluster}" with fresher evidence or a narrower approved answer.`;
  }

  return `Collect approved evidence and draft language for "${questionCluster}" before sharing externally.`;
}

export function buildEvidenceMapDraft(args: {
  questionnaireName: string;
  organizationName?: string | null;
  items: EvidenceMapSourceItem[];
}) {
  const groups = new Map<string, EvidenceMapSourceItem[]>();

  for (const item of args.items) {
    const key = item.normalizedQuestion?.trim() || item.questionText.trim().toLowerCase();
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }

  const items = Array.from(groups.entries()).map(([normalizedQuestion, group]) => {
    const promptList = uniqueStrings(group.map((entry) => entry.questionText));
    const questionCluster = promptList.length === 1 ? promptList[0] : `${promptList[0]} (+${promptList.length - 1} similar)`;
    const supportStrength = inferSupportStrength(group);
    const approvedDrafts = group.map((item) => item.draft).filter(Boolean);
    const firstItem = group[0];

    return {
      questionnaireItemId: firstItem.questionnaireItemId,
      questionCluster,
      normalizedQuestion,
      relatedControlIds: uniqueStrings(approvedDrafts.flatMap((draft) => draft?.mappedControlIds ?? [])),
      evidenceArtifactIds: uniqueStrings(approvedDrafts.flatMap((draft) => draft?.supportingEvidenceIds ?? [])),
      ownerIds: uniqueStrings(group.flatMap((entry) => entry.ownerIds ?? [])),
      supportStrength,
      buyerSafeSummary: buildBuyerSafeSummary(group),
      recommendedNextAction: buildRecommendedNextAction(
        supportStrength,
        approvedDrafts.some((draft) => draft?.status === 'APPROVED'),
        questionCluster
      ),
      relatedTaskId: firstItem.openTaskIds?.[0] ?? null,
      relatedFindingId: firstItem.openFindingIds?.[0] ?? null
    } satisfies EvidenceMapDraftItem;
  });

  const name = `${args.organizationName ?? args.questionnaireName} Evidence Map`;
  const needsReview = items.some((item) => ['WEAK', 'MISSING'].includes(item.supportStrength));
  const hasUnapprovedDraft = args.items.some((item) => item.draft?.status !== 'APPROVED');
  const status: EvidenceMapStatus = needsReview || hasUnapprovedDraft ? 'NEEDS_REVIEW' : 'DRAFT';

  return {
    name,
    status,
    items
  };
}
