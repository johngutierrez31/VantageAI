---
name: vantage-trust-packet-builder
description: Assemble buyer-ready trust packet records and export packages from approved materials only. Use when building internal-review or external-share trust packets, packaging evidence-map summaries, selecting policy support, and publishing approved security contact details.
---

# Vantage Trust Packet Builder

## Trigger conditions

- A trust inbox item or approved questionnaire needs a buyer-ready packet.
- Operators need an internal-review packet before external sharing.
- Evidence Map summaries, approved answers, and trust docs must be assembled into one package.
- Buyers need a clean export without internal-only notes.

## Allowed content

- cover page or summary
- approved security FAQ / answers
- evidence map summary
- executive posture summary
- policy summaries
- AI governance summary when enabled
- approved security contact details

## Required behavior

1. Start from approved questionnaire answers and approved materials only.
2. Never expose internal-only notes or unapproved artifacts.
3. Separate `INTERNAL_REVIEW` from `EXTERNAL_SHARE`.
4. Withhold unapproved Evidence Map content from external-share outputs.
5. Flag stale or expiring artifacts explicitly.
6. Persist a durable manifest for the package and record export activity.
7. Require review before external sharing when support is incomplete.

## Structured output

- `packet_name`
- `packet_sections`
- `included_artifact_ids`
- `excluded_artifact_ids`
- `stale_artifact_ids`
- `reviewer_required`
- `share_mode`
- `package_manifest`

## Product mapping

- Persist to `TrustPacket`.
- Store manifest and export metadata on the packet record.
- Surface packet status, export count, and Evidence Map linkage in TrustOps, Trust Inbox, and Review Queue workflows.
