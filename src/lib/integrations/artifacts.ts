import { prisma } from '@/lib/db/prisma';
import {
  buildTrustPacketManifest,
  renderTrustPacketHtml,
  renderTrustPacketMarkdown,
  type TrustPacketManifest
} from '@/lib/trust/package-export';
import {
  buildBoardBriefExportPayload,
  renderBoardBriefHtml,
  renderBoardBriefMarkdown
} from '@/lib/pulse/export';
import {
  buildAfterActionExportPayload,
  renderAfterActionHtml,
  renderAfterActionMarkdown
} from '@/lib/response-ops/export';

type ArtifactPayload = {
  title: string;
  entityType: 'trust_packet' | 'board_brief' | 'after_action_report' | 'quarterly_review';
  entityId: string;
  html: string;
  markdown: string;
  json: Record<string, unknown>;
};

function parseTrustManifest(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const manifest = value as TrustPacketManifest;
  return Array.isArray(manifest.sections) ? manifest : null;
}

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderQuarterlyReviewMarkdown(review: {
  reviewPeriod: string;
  status: string;
  reviewDate: Date;
  attendeeNames: string[];
  decisionsMade: string[];
  followUpActions: string[];
  notes: string | null;
  boardBriefTitle: string;
  roadmapName: string;
}) {
  return [
    `# ${review.reviewPeriod} Quarterly Review`,
    '',
    `Status: ${review.status}`,
    `Review date: ${review.reviewDate.toISOString()}`,
    `Board brief: ${review.boardBriefTitle}`,
    `Roadmap: ${review.roadmapName}`,
    '',
    '## Attendees',
    '',
    ...(review.attendeeNames.length ? review.attendeeNames.map((name) => `- ${name}`) : ['- None']),
    '',
    '## Decisions Made',
    '',
    ...(review.decisionsMade.length ? review.decisionsMade.map((entry) => `- ${entry}`) : ['- None']),
    '',
    '## Follow-Up Actions',
    '',
    ...(review.followUpActions.length ? review.followUpActions.map((entry) => `- ${entry}`) : ['- None']),
    '',
    '## Notes',
    '',
    review.notes ?? 'No notes captured.',
    ''
  ].join('\n');
}

function renderQuarterlyReviewHtml(review: {
  reviewPeriod: string;
  status: string;
  reviewDate: Date;
  attendeeNames: string[];
  decisionsMade: string[];
  followUpActions: string[];
  notes: string | null;
  boardBriefTitle: string;
  roadmapName: string;
}) {
  const renderList = (items: string[]) =>
    items.length ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : '<p>None.</p>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(review.reviewPeriod)} Quarterly Review</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 32px; color: #132238; }
      h1, h2 { margin-bottom: 10px; }
      .hero { border: 1px solid #d5d9e2; border-radius: 16px; padding: 20px; background: linear-gradient(160deg, #f8fafc, #eef5ff); }
      section { margin-top: 24px; }
      p, li { line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="hero">
      <h1>${esc(review.reviewPeriod)} Quarterly Review</h1>
      <p>Status ${esc(review.status)} | Review date ${esc(review.reviewDate.toISOString())}</p>
      <p>Board brief ${esc(review.boardBriefTitle)} | Roadmap ${esc(review.roadmapName)}</p>
    </div>
    <section>
      <h2>Attendees</h2>
      ${renderList(review.attendeeNames)}
    </section>
    <section>
      <h2>Decisions Made</h2>
      ${renderList(review.decisionsMade)}
    </section>
    <section>
      <h2>Follow-Up Actions</h2>
      ${renderList(review.followUpActions)}
    </section>
    <section>
      <h2>Notes</h2>
      <p>${esc(review.notes ?? 'No notes captured.')}</p>
    </section>
  </body>
</html>`;
}

export async function loadPublishableArtifact(args: {
  tenantId: string;
  artifactType: 'trust_packet' | 'board_brief' | 'after_action_report' | 'quarterly_review';
  artifactId: string;
}) {
  if (args.artifactType === 'trust_packet') {
    const packet = await prisma.trustPacket.findFirst({
      where: { id: args.artifactId, tenantId: args.tenantId },
      include: {
        questionnaireUpload: {
          select: {
            organizationName: true,
            filename: true,
            items: {
              include: {
                draftAnswers: {
                  where: { status: 'APPROVED' },
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        evidenceMap: {
          include: {
            items: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });

    if (!packet) return null;
    const trustDocs = await prisma.trustDoc.findMany({
      where: { tenantId: args.tenantId },
      include: {
        evidence: {
          select: {
            name: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 12
    });

    const existingManifest = parseTrustManifest(packet.packageManifestJson);
    const approvedRows =
      packet.questionnaireUpload?.items
        .map((item) => {
          const approvedDraft = item.draftAnswers[0];
          if (!approvedDraft) return null;
          return {
            rowKey: item.id,
            questionText: item.questionText ?? item.normalizedQuestion ?? 'Approved security question',
            answerText: approvedDraft.answerText,
            confidenceScore: approvedDraft.confidenceScore,
            supportingEvidenceIds: approvedDraft.supportingEvidenceIds,
            mappedControlIds: approvedDraft.mappedControlIds
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)) ?? [];

    const manifest =
      existingManifest ??
      buildTrustPacketManifest({
        packetName: packet.name,
        shareMode: packet.shareMode,
        status: packet.status,
        reviewerRequired: packet.reviewerRequired,
        organizationName: packet.questionnaireUpload?.organizationName ?? packet.questionnaireUpload?.filename,
        approvedContactName: packet.approvedContactName,
        approvedContactEmail: packet.approvedContactEmail,
        approvedRows,
        evidenceMapStatus: packet.evidenceMap?.status,
        evidenceMapItems: packet.evidenceMap?.items.map((item) => ({
          questionCluster: item.questionCluster,
          supportStrength: item.supportStrength,
          buyerSafeSummary: item.buyerSafeSummary,
          recommendedNextAction: item.recommendedNextAction,
          relatedControlIds: item.relatedControlIds,
          evidenceArtifactIds: item.evidenceArtifactIds
        })),
        trustDocs: trustDocs.map((doc) => ({
          category: doc.category,
          evidenceName: doc.evidence.name,
          createdAt: doc.evidence.createdAt.toISOString()
        })),
        staleArtifactIds: packet.staleArtifactIds,
        includeAiGovernanceSummary: packet.includedArtifactIds.some((id) => id.toLowerCase().includes('ai'))
      });

    return {
      title: packet.name,
      entityType: 'trust_packet',
      entityId: packet.id,
      html: renderTrustPacketHtml(manifest),
      markdown: renderTrustPacketMarkdown(manifest),
      json: manifest
    } satisfies ArtifactPayload;
  }

  if (args.artifactType === 'board_brief') {
    const brief = await prisma.boardBrief.findFirst({
      where: { id: args.artifactId, tenantId: args.tenantId },
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

    if (!brief) return null;

    const risks = await prisma.riskRegisterItem.findMany({
      where: {
        tenantId: args.tenantId,
        id: { in: brief.topRiskIds }
      }
    });

    return {
      title: brief.title,
      entityType: 'board_brief',
      entityId: brief.id,
      html: renderBoardBriefHtml(brief, risks),
      markdown: renderBoardBriefMarkdown(brief, risks),
      json: buildBoardBriefExportPayload(brief, risks)
    } satisfies ArtifactPayload;
  }

  if (args.artifactType === 'after_action_report') {
    const report = await prisma.afterActionReport.findFirst({
      where: { id: args.artifactId, tenantId: args.tenantId },
      include: {
        incident: {
          select: {
            title: true,
            incidentType: true,
            severity: true,
            status: true,
            startedAt: true,
            resolvedAt: true
          }
        }
      }
    });

    if (!report) return null;

    return {
      title: report.title,
      entityType: 'after_action_report',
      entityId: report.id,
      html: renderAfterActionHtml(report),
      markdown: renderAfterActionMarkdown(report),
      json: buildAfterActionExportPayload(report)
    } satisfies ArtifactPayload;
  }

  const review = await prisma.quarterlyReview.findFirst({
    where: { id: args.artifactId, tenantId: args.tenantId },
    include: {
      boardBrief: {
        select: {
          title: true
        }
      },
      roadmap: {
        select: {
          name: true
        }
      }
    }
  });

  if (!review) return null;

  const json = {
    id: review.id,
    reviewPeriod: review.reviewPeriod,
    reviewDate: review.reviewDate.toISOString(),
    status: review.status,
    attendeeNames: review.attendeeNames,
    decisionsMade: review.decisionsMade,
    followUpActions: review.followUpActions,
    notes: review.notes,
    boardBriefTitle: review.boardBrief.title,
    roadmapName: review.roadmap.name
  };

  return {
    title: `${review.reviewPeriod} Quarterly Review`,
    entityType: 'quarterly_review',
    entityId: review.id,
    html: renderQuarterlyReviewHtml({
      ...review,
      boardBriefTitle: review.boardBrief.title,
      roadmapName: review.roadmap.name
    }),
    markdown: renderQuarterlyReviewMarkdown({
      ...review,
      boardBriefTitle: review.boardBrief.title,
      roadmapName: review.roadmap.name
    }),
    json
  } satisfies ArtifactPayload;
}
