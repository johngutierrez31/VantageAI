import type { AfterActionReport, Incident } from '@prisma/client';

type AfterActionReportView = AfterActionReport & {
  incident: Pick<Incident, 'title' | 'incidentType' | 'severity' | 'status' | 'startedAt' | 'resolvedAt'>;
};

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function lines(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`) : ['- None'];
}

export function buildAfterActionExportPayload(report: AfterActionReportView) {
  return {
    id: report.id,
    title: report.title,
    status: report.status,
    incident: {
      id: report.incidentId,
      title: report.incident.title,
      incidentType: report.incident.incidentType,
      severity: report.incident.severity,
      status: report.incident.status,
      startedAt: report.incident.startedAt,
      resolvedAt: report.incident.resolvedAt
    },
    summary: report.summary,
    affectedScope: report.affectedScope,
    timelineSummary: report.timelineSummary,
    actionsTaken: report.actionsTaken,
    currentStatus: report.currentStatus,
    lessonsLearned: report.lessonsLearned,
    followUpActions: report.followUpActions,
    decisionsNeeded: report.decisionsNeeded
  };
}

export function renderAfterActionMarkdown(report: AfterActionReportView) {
  const linesOut = [
    `# ${report.title}`,
    '',
    `Incident: ${report.incident.title}`,
    `Type: ${report.incident.incidentType}`,
    `Severity: ${report.incident.severity}`,
    `Status: ${report.status}`,
    '',
    '## Incident Summary',
    '',
    report.summary,
    '',
    '## Affected Scope',
    '',
    report.affectedScope,
    '',
    '## Timeline Summary',
    '',
    ...lines(report.timelineSummary),
    '',
    '## Actions Taken',
    '',
    ...lines(report.actionsTaken),
    '',
    '## Current Status',
    '',
    report.currentStatus,
    '',
    '## Lessons Learned',
    '',
    ...lines(report.lessonsLearned),
    '',
    '## Follow-Up Actions',
    '',
    ...lines(report.followUpActions),
    '',
    '## Decisions Needed',
    '',
    ...lines(report.decisionsNeeded),
    ''
  ];

  return `${linesOut.join('\n')}\n`;
}

export function renderAfterActionHtml(report: AfterActionReportView) {
  const renderList = (items: string[]) =>
    items.length ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : '<p>None.</p>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(report.title)}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 32px; color: #132238; }
      h1, h2 { margin-bottom: 10px; }
      .hero { border: 1px solid #d5d9e2; border-radius: 16px; padding: 20px; background: linear-gradient(160deg, #f7fafc, #eef6ff); }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
      .tile { border: 1px solid #d5d9e2; border-radius: 12px; padding: 12px; background: #fff; }
      section { margin-top: 24px; }
      p, li { line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="hero">
      <h1>${esc(report.title)}</h1>
      <p>${esc(report.incident.title)} | ${esc(report.incident.incidentType)} | ${esc(report.incident.severity)}</p>
      <div class="grid">
        <div class="tile"><strong>Incident status</strong><div>${esc(report.incident.status)}</div></div>
        <div class="tile"><strong>Report status</strong><div>${esc(report.status)}</div></div>
        <div class="tile"><strong>Started</strong><div>${esc(report.incident.startedAt.toISOString())}</div></div>
        <div class="tile"><strong>Resolved</strong><div>${report.incident.resolvedAt ? esc(report.incident.resolvedAt.toISOString()) : 'N/A'}</div></div>
      </div>
    </div>
    <section>
      <h2>Incident Summary</h2>
      <p>${esc(report.summary)}</p>
    </section>
    <section>
      <h2>Affected Scope</h2>
      <p>${esc(report.affectedScope)}</p>
    </section>
    <section>
      <h2>Timeline Summary</h2>
      ${renderList(report.timelineSummary)}
    </section>
    <section>
      <h2>Actions Taken</h2>
      ${renderList(report.actionsTaken)}
    </section>
    <section>
      <h2>Current Status</h2>
      <p>${esc(report.currentStatus)}</p>
    </section>
    <section>
      <h2>Lessons Learned</h2>
      ${renderList(report.lessonsLearned)}
    </section>
    <section>
      <h2>Follow-Up Actions</h2>
      ${renderList(report.followUpActions)}
    </section>
    <section>
      <h2>Decisions Needed</h2>
      ${renderList(report.decisionsNeeded)}
    </section>
  </body>
</html>`;
}
