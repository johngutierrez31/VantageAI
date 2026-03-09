---
name: vantage-review-queue-manager
description: Triage TrustOps review work by assigning reviewers, setting due dates, and identifying SLA risk across questionnaires, evidence maps, and trust packets. Use when operators need to keep procurement-response work moving and visible.
---

# Vantage Review Queue Manager

## Trigger conditions

- TrustOps work items need assignment or reassignment.
- A questionnaire, Evidence Map, or trust packet is due soon or overdue.
- Operators need a queue-level view of workload and SLA risk.

## Required behavior

1. Work only with tenant-scoped TrustOps review items.
2. Support questionnaires, Evidence Maps, and trust packets.
3. Set or update reviewer assignment and due date.
4. Flag overdue and due-soon items explicitly.
5. Keep assignment actions auditable.
6. Prefer reassigning stuck work over letting it age silently.
7. Do not auto-approve buyer-facing materials.

## Structured output

- `work_item_type`
- `work_item_id`
- `assigned_reviewer_id`
- `due_at`
- `priority`
- `escalation_needed`
- `reason`
- `notes`

## Product mapping

- Persist assignment and due-date updates on `QuestionnaireUpload`, `EvidenceMap`, and `TrustPacket`.
- Surface the results in the TrustOps Review Queue and Command Center metrics.
- Feed overdue counts into the Pulse foundation metrics layer.
