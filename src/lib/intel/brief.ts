import type { MissionPlanItem, TenantSecurityPulse } from '@/lib/intel/pulse';
import type { TrendSignal } from '@/lib/intel/trends';

export type WeeklyBrief = {
  generatedAt: string;
  executiveSummary: string;
  now: string[];
  next: string[];
  later: string[];
  missionQueue: MissionPlanItem[];
  trendTitles: string[];
};

function safeSeverityLabel(value: TrendSignal['severity']) {
  if (value === 'critical') return 'Critical';
  if (value === 'high') return 'High';
  return 'Medium';
}

function buildExecutiveSummary(pulse: TenantSecurityPulse, trends: TrendSignal[]) {
  const criticalTrendCount = trends.filter((trend) => trend.severity === 'critical').length;
  return [
    `Open remediation tasks: ${pulse.openTasks} (${pulse.criticalTasks} critical, ${pulse.overdueTasks} overdue).`,
    `Active assessments: ${pulse.assessmentsInProgress}.`,
    `Trust/evidence pressure: ${pulse.pendingEvidenceRequests} requests and ${pulse.trustInboxBacklog} trust backlog items.`,
    `Response pressure: ${pulse.activeIncidents} active incidents, ${pulse.overdueIncidentActions} overdue incident actions, and ${pulse.upcomingTabletops} upcoming tabletop exercises.`,
    `External pressure: ${criticalTrendCount} critical and ${
      trends.filter((trend) => trend.severity === 'high').length
    } high trend signals are currently tracked.`
  ].join(' ');
}

function buildNowActions(pulse: TenantSecurityPulse, missionQueue: MissionPlanItem[]) {
  const actions: string[] = [];

  if (pulse.criticalTasks > 0 || pulse.overdueTasks > 0) {
    actions.push('Close or unblock highest-risk overdue remediation tasks.');
  }

  if (pulse.expiringExceptionsNext7Days > 0) {
    actions.push('Resolve expiring risk exceptions before due date.');
  }

  if (pulse.activeIncidents > 0 || pulse.overdueIncidentActions > 0) {
    actions.push('Work active incident command and clear overdue incident actions.');
  }

  const p0Missions = missionQueue.filter((mission) => mission.priority === 'P0').slice(0, 2);
  for (const mission of p0Missions) {
    actions.push(`${mission.title} (${mission.day})`);
  }

  if (actions.length === 0) {
    actions.push('Execute top identity-hardening action and document evidence.');
  }

  return actions;
}

function buildNextActions(missionQueue: MissionPlanItem[]) {
  return missionQueue
    .filter((mission) => mission.priority !== 'P0')
    .slice(0, 3)
    .map((mission) => `${mission.title} (${mission.day})`);
}

function buildLaterActions(trends: TrendSignal[]) {
  return trends
    .filter((trend) => trend.severity !== 'critical')
    .slice(0, 3)
    .map((trend) => `${trend.title} (${safeSeverityLabel(trend.severity)})`);
}

export function buildWeeklyBrief(
  pulse: TenantSecurityPulse,
  trends: TrendSignal[],
  missionQueue: MissionPlanItem[]
): WeeklyBrief {
  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    executiveSummary: buildExecutiveSummary(pulse, trends),
    now: buildNowActions(pulse, missionQueue),
    next: buildNextActions(missionQueue),
    later: buildLaterActions(trends),
    missionQueue,
    trendTitles: trends.slice(0, 7).map((trend) => trend.title)
  };
}

export function renderWeeklyBriefMarkdown(brief: WeeklyBrief) {
  return [
    '# VantageCISO Weekly Brief',
    '',
    `Generated: ${brief.generatedAt}`,
    '',
    '## Executive Summary',
    brief.executiveSummary,
    '',
    '## Now (0-7 days)',
    ...brief.now.map((item) => `- ${item}`),
    '',
    '## Next (8-30 days)',
    ...brief.next.map((item) => `- ${item}`),
    '',
    '## Later (31-90 days)',
    ...brief.later.map((item) => `- ${item}`),
    '',
    '## Weekly Execution Queue',
    ...brief.missionQueue.map((item) => `- ${item.day} [${item.priority}] ${item.title}`),
    '',
    '## Trend Radar',
    ...brief.trendTitles.map((title) => `- ${title}`)
  ].join('\n');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderWeeklyBriefHtml(brief: WeeklyBrief) {
  const list = (values: string[]) => values.map((value) => `<li>${escapeHtml(value)}</li>`).join('');
  const missionList = brief.missionQueue
    .map((item) => `<li>${escapeHtml(`${item.day} [${item.priority}] ${item.title}`)}</li>`)
    .join('');
  const trendList = list(brief.trendTitles);

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <title>VantageCISO Weekly Brief</title>',
    '  <style>',
    '    body { font-family: Arial, sans-serif; max-width: 960px; margin: 2rem auto; color: #0f172a; line-height: 1.5; }',
    '    h1, h2 { color: #0f172a; }',
    '    .panel { border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; background: #f8fafc; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <h1>VantageCISO Weekly Brief</h1>',
    `  <p><strong>Generated:</strong> ${escapeHtml(brief.generatedAt)}</p>`,
    '  <div class="panel">',
    '    <h2>Executive Summary</h2>',
    `    <p>${escapeHtml(brief.executiveSummary)}</p>`,
    '  </div>',
    '  <div class="panel"><h2>Now (0-7 days)</h2><ul>',
    list(brief.now),
    '  </ul></div>',
    '  <div class="panel"><h2>Next (8-30 days)</h2><ul>',
    list(brief.next),
    '  </ul></div>',
    '  <div class="panel"><h2>Later (31-90 days)</h2><ul>',
    list(brief.later),
    '  </ul></div>',
    '  <div class="panel"><h2>Weekly Execution Queue</h2><ul>',
    missionList,
    '  </ul></div>',
    '  <div class="panel"><h2>Trend Radar</h2><ul>',
    trendList,
    '  </ul></div>',
    '</body>',
    '</html>'
  ].join('\n');
}
