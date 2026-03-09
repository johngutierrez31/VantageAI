---
name: vantage-after-action-generator
description: Draft a durable after-action report from the incident record, timeline, tasks, findings, and risks. Use when operators need review-gated incident closeout and executive-ready follow-up summaries.
---

# Vantage After-Action Generator

## Trigger conditions

- Draft After-Action Report
- An incident has enough timeline and task data for review
- Leadership needs a concise executive-ready closeout
- Post-incident follow-up must become durable tasks, findings, or risk work

## Required behavior

1. Start from tenant-scoped `Incident`, `IncidentTimelineEvent`, `Task`, `Finding`, and `RiskRegisterItem` data only.
2. Build a durable `AfterActionReport` record, not transient output.
3. Separate internal-only notes from shareable timeline and summary content.
4. Create or refresh post-incident follow-up tasks where actions remain open.
5. Require review before export or share.
6. Never invent lessons learned, containment outcomes, or business impact that are not supported by the incident record.

## Structured output

- `incident_id`
- `report_id` or `candidate_report_id`
- `summary`
- `affected_scope`
- `timeline_highlights`
- `actions_taken`
- `lessons_learned`
- `follow_up_actions`
- `decisions_needed`
- `reviewer_required`
- `notes`

## Product mapping

- Persist to `AfterActionReport`.
- Link the report back to the `Incident`.
- Create or refresh post-incident `Task` records when follow-up actions exist.
- Use review-gated export flows for `html`, `markdown`, and `json`.
