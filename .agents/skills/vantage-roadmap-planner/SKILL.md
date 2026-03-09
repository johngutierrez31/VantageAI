---
name: vantage-roadmap-planner
description: Turn Pulse risks, findings, overdue remediation work, and weak scorecard categories into a durable 30 / 60 / 90 remediation roadmap. Use when operators need a leadership-readable plan with ownership and expected impact.
---

# Vantage Roadmap Planner

## Trigger conditions

- A Pulse snapshot has identified weak categories or material posture drag.
- The risk register needs to be translated into a practical 30 / 60 / 90 plan.
- Leadership needs an owner-based remediation roadmap for quarterly review or board reporting.
- Operators need to convert TrustOps and findings pressure into a recurring executive plan.

## Required behavior

1. Start from tenant-scoped Pulse snapshots, risks, findings, tasks, and TrustOps gaps only.
2. Prioritize work that measurably improves posture and buyer readiness.
3. Assign each roadmap item to a `30`, `60`, or `90` day horizon.
4. Preserve owner, due date, rationale, expected impact, and source links.
5. Keep roadmap records reviewable and editable by humans after generation.
6. Avoid duplicate roadmap items when the same source pressure already exists in the current plan.
7. Feed roadmap summaries into board briefs and quarterly reviews.

## Structured output

- `roadmap_item_id`
- `candidate_item_id`
- `title`
- `horizon`
- `owner_id`
- `due_at`
- `linked_source_ids`
- `expected_impact`
- `reviewer_required`
- `notes`

## Product mapping

- Persist to `PulseRoadmap` and `RoadmapItem`.
- Link items to `RiskRegisterItem`, `Finding`, `Task`, and weak Pulse categories where applicable.
- Surface roadmap execution in Pulse, Command Center, Board Brief, and Quarterly Review workflows.
