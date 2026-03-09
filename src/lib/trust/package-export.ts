type PacketRow = {
  rowKey: string;
  questionText: string;
  answerText: string;
  confidenceScore: number;
  supportingEvidenceIds: string[];
  mappedControlIds: string[];
};

type PacketEvidenceMapItem = {
  questionCluster: string;
  supportStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'MISSING';
  buyerSafeSummary: string;
  recommendedNextAction: string;
  relatedControlIds: string[];
  evidenceArtifactIds: string[];
};

type PacketTrustDoc = {
  category: string;
  evidenceName: string;
  createdAt: string;
};

export type TrustPacketManifest = {
  packetName: string;
  shareMode: 'INTERNAL_REVIEW' | 'EXTERNAL_SHARE';
  generatedAt: string;
  status: string;
  organizationName: string;
  reviewerRequired: boolean;
  staleArtifactIds: string[];
  approvedContact: {
    name: string | null;
    email: string | null;
  };
  sections: Array<{
    id: string;
    title: string;
    items: Array<Record<string, unknown>>;
  }>;
};

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildTrustPacketManifest(args: {
  packetName: string;
  shareMode: 'INTERNAL_REVIEW' | 'EXTERNAL_SHARE';
  status: string;
  reviewerRequired: boolean;
  organizationName?: string | null;
  approvedContactName?: string | null;
  approvedContactEmail?: string | null;
  approvedRows: PacketRow[];
  evidenceMapStatus?: string | null;
  evidenceMapItems?: PacketEvidenceMapItem[];
  trustDocs: PacketTrustDoc[];
  staleArtifactIds: string[];
  includeAiGovernanceSummary?: boolean;
}) {
  const generatedAt = new Date().toISOString();
  const organizationName = args.organizationName?.trim() || 'Customer diligence package';

  const sections: TrustPacketManifest['sections'] = [
    {
      id: 'cover-summary',
      title: 'Cover Summary',
      items: [
        {
          organizationName,
          packetName: args.packetName,
          generatedAt,
          shareMode: args.shareMode.replace(/_/g, ' '),
          reviewerRequired: args.reviewerRequired
        }
      ]
    },
    {
      id: 'approved-security-faq',
      title: 'Approved Security FAQ',
      items: args.approvedRows.map((row) => ({
        question: row.questionText,
        answer: row.answerText,
        confidenceScore: row.confidenceScore,
        mappedControlIds: row.mappedControlIds,
        supportingEvidenceIds: row.supportingEvidenceIds
      }))
    },
    {
      id: 'evidence-map-summary',
      title: 'Evidence Map Summary',
      items: (args.evidenceMapItems ?? []).map((item) => ({
        questionCluster: item.questionCluster,
        supportStrength: item.supportStrength,
        buyerSafeSummary: item.buyerSafeSummary,
        recommendedNextAction:
          args.shareMode === 'INTERNAL_REVIEW' ? item.recommendedNextAction : undefined,
        relatedControlIds: item.relatedControlIds,
        evidenceArtifactIds: item.evidenceArtifactIds
      }))
    },
    {
      id: 'policy-summaries',
      title: 'Policy Summaries',
      items: args.trustDocs.map((doc) => ({
        category: doc.category,
        evidenceName: doc.evidenceName,
        capturedAt: doc.createdAt
      }))
    },
    {
      id: 'executive-posture-summary',
      title: 'Executive Posture Summary',
      items: [
        {
          summary:
            args.shareMode === 'EXTERNAL_SHARE'
              ? 'Security operations are managed through documented review workflows, approved answer reuse, evidence-backed responses, and maintained policy artifacts.'
              : 'Internal review copy: validate stale artifacts, reviewer notes, and evidence-map support before external publication.',
          evidenceMapStatus: args.evidenceMapStatus ?? 'not_generated',
          staleArtifactCount: args.staleArtifactIds.length
        }
      ]
    },
    {
      id: 'approved-contact-details',
      title: 'Approved Contact Details',
      items: [
        {
          name: args.approvedContactName ?? null,
          email: args.approvedContactEmail ?? null
        }
      ]
    }
  ];

  if (args.includeAiGovernanceSummary) {
    sections.push({
      id: 'ai-governance-summary',
      title: 'AI Governance Summary',
      items: [
        {
          summary: 'AI governance materials are available for buyer diligence in this packet.'
        }
      ]
    });
  }

  return {
    packetName: args.packetName,
    shareMode: args.shareMode,
    generatedAt,
    status: args.status,
    organizationName,
    reviewerRequired: args.reviewerRequired,
    staleArtifactIds: args.staleArtifactIds,
    approvedContact: {
      name: args.approvedContactName ?? null,
      email: args.approvedContactEmail ?? null
    },
    sections
  } satisfies TrustPacketManifest;
}

export function renderTrustPacketMarkdown(manifest: TrustPacketManifest) {
  const lines: string[] = [
    `# ${manifest.packetName}`,
    '',
    `Generated: ${manifest.generatedAt}`,
    `Share mode: ${manifest.shareMode.replace(/_/g, ' ')}`,
    `Status: ${manifest.status}`,
    ''
  ];

  for (const section of manifest.sections) {
    lines.push(`## ${section.title}`, '');
    if (section.items.length === 0) {
      lines.push('No content available.', '');
      continue;
    }

    for (const item of section.items) {
      for (const [key, value] of Object.entries(item)) {
        if (value === undefined || value === null || value === '') continue;
        lines.push(`- ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
      }
      lines.push('');
    }
  }

  if (manifest.staleArtifactIds.length) {
    lines.push('## Stale Artifact Flags', '');
    for (const artifactId of manifest.staleArtifactIds) {
      lines.push(`- ${artifactId}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

export function renderTrustPacketHtml(manifest: TrustPacketManifest) {
  const sections = manifest.sections
    .map(
      (section) => `
        <section>
          <h2>${esc(section.title)}</h2>
          ${
            section.items.length
              ? section.items
                  .map(
                    (item) => `
                      <div class="card">
                        ${Object.entries(item)
                          .filter(([, value]) => value !== undefined && value !== null && value !== '')
                          .map(
                            ([key, value]) => `
                              <p><strong>${esc(key)}:</strong> ${
                                Array.isArray(value) ? esc(value.join(', ')) : esc(String(value))
                              }</p>
                            `
                          )
                          .join('')}
                      </div>
                    `
                  )
                  .join('')
              : '<p>No content available.</p>'
          }
        </section>
      `
    )
    .join('');

  const stale = manifest.staleArtifactIds.length
    ? `
      <section>
        <h2>Stale Artifact Flags</h2>
        <ul>${manifest.staleArtifactIds.map((artifactId) => `<li>${esc(artifactId)}</li>`).join('')}</ul>
      </section>
    `
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(manifest.packetName)}</title>
    <style>
      body { font-family: Georgia, serif; margin: 40px; color: #102133; }
      h1, h2 { margin-bottom: 12px; }
      .meta { color: #516070; font-size: 14px; margin-bottom: 24px; }
      .card { border: 1px solid #d7dde5; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
      section { margin-bottom: 24px; }
    </style>
  </head>
  <body>
    <h1>${esc(manifest.packetName)}</h1>
    <div class="meta">
      <p>Generated: ${esc(manifest.generatedAt)}</p>
      <p>Share mode: ${esc(manifest.shareMode.replace(/_/g, ' '))}</p>
      <p>Status: ${esc(manifest.status)}</p>
      <p>Organization: ${esc(manifest.organizationName)}</p>
    </div>
    ${sections}
    ${stale}
  </body>
</html>`;
}
