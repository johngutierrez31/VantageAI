---
name: vantage-board-brief-generator
description: Generate persisted Pulse board briefs and executive cyber updates from scorecards, risks, remediation progress, and TrustOps signals. Use when leadership needs a durable board brief workflow, concise posture narrative, overdue-action review, or decision-focused cyber update.
---

# Vantage Board Brief Generator

## Trigger conditions

- A Pulse snapshot exists and leadership needs a board-ready update.
- The risk register and roadmap need to be translated into executive language.
- A quarterly review or leadership cadence needs a durable briefing artifact.
- Operators need review-gated exportable board reporting, not transient chat output.

## Required behavior

1. Start from tenant-scoped Pulse snapshots, risk register items, roadmap items, and TrustOps carry-over signals only.
2. Separate measured inputs and confirmed risks from inferred concerns or commentary.
3. Use business-readable language and avoid unnecessary jargon.
4. Highlight trend movement, business impact, owners, overdue items, and decisions needed.
5. Summarize 30 / 60 / 90 day roadmap commitments clearly.
6. Persist the output to a durable `BoardBrief` record with review state.
7. Require approval before export or external distribution.

## Structured output

- `board_brief_id`
- `reporting_period`
- `overall_posture_summary`
- `top_risk_ids`
- `notable_improvements`
- `overdue_actions`
- `leadership_decisions_needed`
- `roadmap_30_days`
- `roadmap_60_days`
- `roadmap_90_days`
- `reviewer_required`
- `status`

## Product mapping

- Persist to `BoardBrief`.
- Link the record to `PulseSnapshot`, `PulseRoadmap`, and top `RiskRegisterItem` records.
- Surface the workflow in Pulse, Command Center, Tools Hub, and quarterly review preparation.
- Use review-gated exports for `html`, `markdown`, and `json`.
