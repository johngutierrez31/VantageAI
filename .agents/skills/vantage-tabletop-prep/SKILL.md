---
name: vantage-tabletop-prep
description: Generate a lightweight tabletop exercise record, participant plan, scenario outline, and follow-up capture structure. Use when teams need a practical incident-readiness exercise that converts gaps into durable work.
---

# Vantage Tabletop Prep

## Trigger conditions

- Prepare Tabletop Exercise
- A team needs a lightweight readiness drill for ransomware, identity compromise, third-party breach, phishing, cloud exposure, or AI misuse
- Operators want exercise gaps to become tasks, findings, and risks instead of static notes

## Required behavior

1. Create or update a tenant-scoped `TabletopExercise` record.
2. Generate scenario summary, exercise objectives, expected decisions, likely gap areas, and follow-up capture prompts.
3. Keep the workflow practical and lightweight rather than building a full simulation platform.
4. On completion, sync durable follow-up `Task`, `Finding`, and `RiskRegisterItem` records when gaps exist.
5. Preserve review notes and completion metadata for recurring readiness cadence.

## Structured output

- `tabletop_id` or `candidate_tabletop_id`
- `scenario_type`
- `scenario_summary`
- `participant_roles`
- `exercise_objectives`
- `expected_decisions`
- `likely_gap_areas`
- `follow_up_items`
- `reviewer_required`
- `notes`

## Product mapping

- Persist to `TabletopExercise`.
- Create follow-up `Task` rows when the exercise is completed and gaps remain.
- Sync linked `Finding` and `RiskRegisterItem` records for meaningful exercise gaps.
- Surface the exercise in Response Ops, Command Center, and Pulse carry-over views.
