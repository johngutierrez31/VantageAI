---
name: vantage-answer-library-curator
description: Curate the approved TrustOps answer library by promoting approved questionnaire answers, deduplicating reusable language, tagging scope, and archiving weak or stale entries. Use when operators need to improve answer reuse quality and govern buyer-safe response content.
---

# Vantage Answer Library Curator

## Trigger conditions

- Approved questionnaire answers should be promoted into the reusable answer library.
- Operators need to convert tenant-specific answers into reusable canonical entries.
- Library entries need ownership, archival, or scope review.
- TrustOps wants to improve reuse quality before the next buyer diligence cycle.

## Required behavior

1. Start from approved questionnaire outputs only.
2. Normalize similar questions and identify canonical wording.
3. Preserve linked controls and approved supporting evidence.
4. Distinguish `REUSABLE` from `TENANT_SPECIFIC`.
5. Preserve approval metadata, usage count, source questionnaire, and owner when available.
6. Archive entries instead of deleting them when they are stale or no longer buyer-safe.
7. Never promote rejected, low-confidence, or unsupported answers.

## Structured output

- `candidate_answer_id`
- `promotion_decision`
- `canonical_question`
- `linked_control_ids`
- `linked_evidence_ids`
- `reviewer_required`
- `archival_or_update_reason`
- `notes`

## Product mapping

- Persist curated entries to `ApprovedAnswer`.
- Update `status`, `scope`, `ownerUserId`, `usageCount`, `lastUsedAt`, and source questionnaire metadata.
- Surface curated entries in the dedicated Answer Library page and guided workflow launchers.
