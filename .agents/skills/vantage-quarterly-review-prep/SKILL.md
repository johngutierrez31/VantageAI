---
name: vantage-quarterly-review-prep
description: Assemble the recurring leadership review package from the current Pulse snapshot, top risks, roadmap, and board brief. Use when an operator needs a durable quarterly review record with decisions and follow-up actions.
---

# Vantage Quarterly Review Prep

## Trigger conditions

- A board brief and roadmap exist and leadership review needs to be scheduled or prepared.
- Operators need a recurring quarterly cadence tied to current posture and risks.
- Follow-up actions and decisions from executive review need to persist in the app.

## Required behavior

1. Use tenant-scoped Pulse snapshot, board brief, roadmap, and risk data only.
2. Pull forward current top risks, open questions, and decisions needed.
3. Persist the review as a durable `QuarterlyReview` record.
4. Support reviewer notes, attendees, decisions made, and follow-up actions.
5. Keep the review lightweight and operator-friendly rather than turning it into meeting software.
6. Require an approved board brief before finalization.
7. Preserve audit logging and tenant scoping for preparation and finalization steps.

## Structured output

- `review_period`
- `snapshot_id`
- `board_brief_id`
- `top_risk_ids`
- `roadmap_item_ids`
- `decisions_needed`
- `open_questions`
- `reviewer_required`
- `notes`

## Product mapping

- Persist to `QuarterlyReview`.
- Link the review to `PulseSnapshot`, `BoardBrief`, and `PulseRoadmap`.
- Surface the workflow in Pulse, Command Center, and Tools Hub as a recurring executive cadence.
