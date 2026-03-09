---
name: vantage-incident-triage
description: Start a new incident triage workflow from operator input or a known scenario type and generate the first-hour response scaffold. Use when incidents need durable records, immediate actions, evidence collection steps, communication ownership, and linked response follow-up.
---

# Vantage Incident Triage

## Trigger conditions

- Start Incident Triage
- A new security incident needs a first-hour operating plan
- An operator needs a durable incident record instead of ad hoc notes
- A known scenario like ransomware, third-party breach, phishing, identity compromise, AI misuse, or cloud exposure needs guided startup

## Required behavior

1. Create or update a tenant-scoped `Incident` record.
2. Classify incident type, severity, owner, communications owner, and affected scope.
3. Generate immediate actions, evidence collection actions, communications actions, and initial decision prompts.
4. Launch or recommend the incident-linked runbook pack when guided startup is enabled.
5. Create timeline and decision-log records instead of leaving critical startup steps transient.
6. Sync linked findings, risks, and tasks when severity or scenario requires it.
7. Never invent impact, containment, or customer-facing facts that are not present in the incident record.

## Structured output

- `incident_id` or `candidate_incident_id`
- `incident_type`
- `severity`
- `initial_owner_id`
- `immediate_actions`
- `evidence_collection_actions`
- `communications_actions`
- `recommended_runbook_ids`
- `escalation_needed`
- `linked_finding_ids`
- `linked_risk_ids`
- `notes`

## Product mapping

- Persist to `Incident`.
- Write related `IncidentTimelineEvent` records for triage start and early decision prompts.
- Launch `IncidentRunbookPack` generation when enabled.
- Sync downstream `Finding`, `RiskRegisterItem`, and `Task` records as incident pressure warrants.
