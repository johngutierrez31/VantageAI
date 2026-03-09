import type { BoardBrief, PulseSnapshot, PulseRoadmap, RiskRegisterItem } from '@prisma/client';

type BoardBriefView = BoardBrief & {
  snapshot: Pick<PulseSnapshot, 'reportingPeriod' | 'overallScore' | 'overallDelta'>;
  roadmap: Pick<PulseRoadmap, 'name' | 'status'>;
};

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function linesFor(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`) : ['- None'];
}

export function renderBoardBriefMarkdown(brief: BoardBriefView, risks: RiskRegisterItem[]) {
  const riskById = new Map(risks.map((risk) => [risk.id, risk]));
  const topRisks = brief.topRiskIds.map((riskId) => riskById.get(riskId)?.title ?? riskId);

  const lines = [
    `# ${brief.title}`,
    '',
    `Reporting period: ${brief.reportingPeriod}`,
    `Status: ${brief.status}`,
    `Overall posture: ${brief.snapshot.overallScore.toFixed(1)} / 100`,
    brief.snapshot.overallDelta === null ? 'Delta: N/A' : `Delta: ${brief.snapshot.overallDelta.toFixed(1)}`,
    '',
    '## Overall Posture Summary',
    '',
    brief.overallPostureSummary,
    '',
    '## Top Risks',
    '',
    ...linesFor(topRisks),
    '',
    '## Notable Improvements',
    '',
    ...linesFor(brief.notableImprovements),
    '',
    '## Overdue Actions',
    '',
    ...linesFor(brief.overdueActions),
    '',
    '## Leadership Decisions Needed',
    '',
    ...linesFor(brief.leadershipDecisionsNeeded),
    '',
    '## 30 Day Roadmap',
    '',
    ...linesFor(brief.roadmap30Days),
    '',
    '## 60 Day Roadmap',
    '',
    ...linesFor(brief.roadmap60Days),
    '',
    '## 90 Day Roadmap',
    '',
    ...linesFor(brief.roadmap90Days),
    ''
  ];

  return `${lines.join('\n')}\n`;
}

export function renderBoardBriefHtml(brief: BoardBriefView, risks: RiskRegisterItem[]) {
  const riskById = new Map(risks.map((risk) => [risk.id, risk]));
  const topRisks = brief.topRiskIds.map((riskId) => riskById.get(riskId)?.title ?? riskId);
  const renderList = (items: string[]) =>
    items.length ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : '<p>None.</p>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(brief.title)}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 32px; color: #102133; }
      h1, h2 { margin-bottom: 12px; }
      .hero { border: 1px solid #d5d9e2; border-radius: 16px; padding: 20px; background: linear-gradient(160deg, #f8fafc, #eef4ff); }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
      .tile { border: 1px solid #d5d9e2; border-radius: 12px; padding: 12px; background: #fff; }
      section { margin-top: 24px; }
      p, li { line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="hero">
      <h1>${esc(brief.title)}</h1>
      <p>${esc(brief.reportingPeriod)} | Status ${esc(brief.status)} | Roadmap ${esc(brief.roadmap.name)}</p>
      <div class="grid">
        <div class="tile"><strong>Overall posture</strong><div>${brief.snapshot.overallScore.toFixed(1)} / 100</div></div>
        <div class="tile"><strong>Delta</strong><div>${brief.snapshot.overallDelta === null ? 'N/A' : brief.snapshot.overallDelta.toFixed(1)}</div></div>
        <div class="tile"><strong>Roadmap</strong><div>${esc(brief.roadmap.status)}</div></div>
      </div>
    </div>
    <section>
      <h2>Overall Posture Summary</h2>
      <p>${esc(brief.overallPostureSummary)}</p>
    </section>
    <section>
      <h2>Top Risks</h2>
      ${renderList(topRisks)}
    </section>
    <section>
      <h2>Notable Improvements</h2>
      ${renderList(brief.notableImprovements)}
    </section>
    <section>
      <h2>Overdue Actions</h2>
      ${renderList(brief.overdueActions)}
    </section>
    <section>
      <h2>Leadership Decisions Needed</h2>
      ${renderList(brief.leadershipDecisionsNeeded)}
    </section>
    <section>
      <h2>30 / 60 / 90 Day Roadmap</h2>
      <h3>30 Days</h3>
      ${renderList(brief.roadmap30Days)}
      <h3>60 Days</h3>
      ${renderList(brief.roadmap60Days)}
      <h3>90 Days</h3>
      ${renderList(brief.roadmap90Days)}
    </section>
  </body>
</html>`;
}

export function buildBoardBriefExportPayload(brief: BoardBriefView, risks: RiskRegisterItem[]) {
  const riskById = new Map(risks.map((risk) => [risk.id, risk]));

  return {
    id: brief.id,
    title: brief.title,
    reportingPeriod: brief.reportingPeriod,
    status: brief.status,
    overallPostureSummary: brief.overallPostureSummary,
    snapshot: {
      score: brief.snapshot.overallScore,
      delta: brief.snapshot.overallDelta
    },
    topRisks: brief.topRiskIds.map((riskId) => ({
      id: riskId,
      title: riskById.get(riskId)?.title ?? riskId,
      severity: riskById.get(riskId)?.severity ?? null,
      status: riskById.get(riskId)?.status ?? null,
      ownerUserId: riskById.get(riskId)?.ownerUserId ?? null
    })),
    notableImprovements: brief.notableImprovements,
    overdueActions: brief.overdueActions,
    leadershipDecisionsNeeded: brief.leadershipDecisionsNeeded,
    roadmap: {
      roadmap30Days: brief.roadmap30Days,
      roadmap60Days: brief.roadmap60Days,
      roadmap90Days: brief.roadmap90Days
    }
  };
}
