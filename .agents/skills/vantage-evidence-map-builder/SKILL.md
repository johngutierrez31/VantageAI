---
name: vantage-evidence-map-builder
description: Build persisted buyer-ready Evidence Map records from questionnaire drafts, approved answers, controls, evidence, tasks, and findings. Use when trust workflows require evidence coverage views, duplicate question collapse, support-strength review, or trust-packet preparation.
---

# Vantage Evidence Map Builder

## Trigger conditions

- A questionnaire has approved or review-pending drafts and needs buyer-ready support mapping.
- TrustOps needs a durable Evidence Map record for review, approval, or packet assembly.
- Operators need to collapse duplicate buyer questions into one support cluster.
- Weak or missing support must be surfaced with linked tasks or findings.

## Required behavior

1. Normalize and cluster equivalent buyer questions.
2. Use tenant-approved controls, evidence, and questionnaire outputs only.
3. Prefer the smallest sufficient support set.
4. Mark support strength explicitly as `STRONG`, `MODERATE`, `WEAK`, or `MISSING`.
5. Carry related owners, tasks, and findings forward where they already exist.
6. Persist the output as an `EvidenceMap` with `EvidenceMapItem` records.
7. Route regenerated or weak-support maps into review instead of treating them as automatically approved.
8. Never include internal-only notes in buyer-safe summaries.

## Structured output

- `evidence_map_id`
- `status`
- `question_cluster`
- `normalized_question`
- `related_control_ids`
- `evidence_artifact_ids`
- `owner_ids`
- `support_strength`
- `buyer_safe_summary`
- `recommended_next_action`
- `related_task_id`
- `related_finding_id`

## Product mapping

- Persist to `EvidenceMap` and `EvidenceMapItem`.
- Link back to `QuestionnaireUpload`, `TrustInboxItem`, and `TrustPacket` where available.
- Feed weak or missing support into TrustOps review queue and findings workflows.
- Surface approved Evidence Maps in trust-packet assembly and buyer-ready exports.
