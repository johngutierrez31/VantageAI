import { describe, expect, it } from 'vitest';
import {
  buildIncidentDefaults,
  buildIncidentTaskTemplates,
  listIncidentScenarioSummaries
} from '../src/lib/response-ops/templates';

describe('response ops scenario templating', () => {
  it('builds practical first-hour defaults for known scenarios', () => {
    const defaults = buildIncidentDefaults({
      incidentType: 'THIRD_PARTY_BREACH'
    });

    expect(defaults.severity).toBe('HIGH');
    expect(defaults.title).toContain('Third-party breach');
    expect(defaults.executiveSummary).toContain('Current severity');
    expect(defaults.recommendedRunbookId).toBeTruthy();
    expect(defaults.decisionLogPrompts.length).toBeGreaterThanOrEqual(3);
    expect(defaults.taskTemplates.some((task) => task.phase === 'COMMUNICATIONS')).toBe(true);
    expect(defaults.taskTemplates.some((task) => task.phase === 'POST_INCIDENT_REVIEW')).toBe(true);
  });

  it('returns de-duplicated, due-date-ordered task packs for critical incidents', () => {
    const tasks = buildIncidentTaskTemplates({
      incidentType: 'RANSOMWARE',
      severity: 'CRITICAL'
    });

    expect(tasks.length).toBeGreaterThanOrEqual(5);
    expect(tasks.every((task) => task.dueOffsetHours >= 1)).toBe(true);
    expect(tasks[0]?.dueOffsetHours).toBeLessThanOrEqual(tasks[tasks.length - 1]?.dueOffsetHours ?? 999);
    expect(new Set(tasks.map((task) => `${task.phase}:${task.title}`)).size).toBe(tasks.length);
    expect(tasks.some((task) => task.priority === 'CRITICAL')).toBe(true);
  });

  it('publishes operator-facing scenario summaries for guided launchers', () => {
    const summaries = listIncidentScenarioSummaries();

    expect(summaries.some((scenario) => scenario.incidentType === 'IDENTITY_COMPROMISE')).toBe(true);
    expect(summaries.some((scenario) => scenario.incidentType === 'AI_MISUSE')).toBe(true);
    expect(summaries.every((scenario) => scenario.label.length > 3)).toBe(true);
  });
});
