---
name: vantage-trust-room-publisher
description: Publish a buyer-facing Trust Room from an approved TrustOps packet with explicit section selection, gated sharing mode, and external-safe buyer presentation. Use when operators need to launch or update protected-link or request-gated buyer review spaces without exposing internal-only material.
---

# Vantage Trust Room Publisher

## Trigger conditions

- An approved `TrustPacket` needs a buyer-facing room instead of a one-off export.
- A seller needs a protected link or request-gated trust review experience.
- TrustOps needs to publish a compact buyer-safe room tied to a live questionnaire or trust packet.

## Required behavior

1. Start from a durable `TrustPacket` and its persisted manifest, not ad hoc copied content.
2. Publish only approved external-safe sections.
3. Support `INTERNAL_REVIEW`, `PROTECTED_LINK`, and `REQUEST_ACCESS` room modes.
4. Keep internal notes, reviewer comments, and unapproved evidence out of the room.
5. Persist the room as a durable `TrustRoom` record linked to the packet, inbox item, and questionnaire when present.
6. Record room publish and update activity in audit-aware operator workflows.

## Structured output

- `trust_room_id`
- `trust_packet_id`
- `room_name`
- `room_slug`
- `access_mode`
- `room_sections`
- `terms_required`
- `nda_required`
- `share_url`

## Product mapping

- Persist to `TrustRoom`.
- Reuse the stored `TrustPacket.packageManifestJson`.
- Surface publishing and room-management workflows in TrustOps and Tools Hub.
