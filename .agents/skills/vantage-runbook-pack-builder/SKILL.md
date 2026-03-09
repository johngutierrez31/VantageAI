---
name: vantage-runbook-pack-builder
description: Generate and persist an incident-linked runbook task pack based on incident type and severity. Use when operators need phase-based tasks for triage, containment, recovery, communications, and post-incident follow-up.
---

# Vantage Runbook Pack Builder

## Trigger conditions

- Launch Runbook Task Pack
- A new or active incident needs structured execution tasks
- An operator needs to refresh or extend incident work without losing auditability
- Scenario-specific incident handling needs phase-based task ownership

## Required behavior

1. Start from a tenant-scoped `Incident` record.
2. Use incident type, severity, and known runbook mappings to build a practical task pack.
3. Group tasks by operational phase: triage, evidence collection, containment, eradication, recovery, communications, and post-incident review.
4. Persist the pack to `IncidentRunbookPack` and persist linked `Task` records with due dates, status, and phase metadata.
5. Avoid duplicate open tasks when a similar pack already exists.
6. Record the launch in the incident timeline and audit log.

## Structured output

- `incident_id`
- `runbook_pack_id` or `candidate_pack_id`
- `incident_type`
- `severity`
- `task_groups`
- `assigned_owner_ids`
- `due_dates`
- `linked_task_ids`
- `reviewer_required`
- `notes`

## Product mapping

- Persist to `IncidentRunbookPack`.
- Persist linked `Task` rows with `responseOpsPhase` and incident associations.
- Add a durable timeline event to `IncidentTimelineEvent`.
- Surface the pack in Response Ops incident detail and dashboard views.
