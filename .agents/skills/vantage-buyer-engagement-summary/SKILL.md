---
name: vantage-buyer-engagement-summary
description: Summarize buyer interaction with published Trust Rooms using durable room-view, section-view, packet-download, and access-grant records. Use when operators need practical engagement visibility tied to trust packets and buyer access requests.
---

# Vantage Buyer Engagement Summary

## Trigger conditions

- A seller wants to know whether a buyer opened the Trust Room or downloaded the packet.
- TrustOps needs a concise engagement summary before a follow-up call.
- Operators want to see which room sections attracted the most buyer attention.

## Required behavior

1. Use persisted `TrustRoomEngagementEvent` records only.
2. Keep the analytics practical: views, downloads, requests, access grants, and top sections.
3. Tie engagement back to the specific `TrustRoom`, `TrustPacket`, and `TrustRoomAccessRequest` when available.
4. Do not invent page-depth or portal-style analytics that are not actually recorded.
5. Present the summary in operator-friendly language suitable for seller and security follow-up.

## Structured output

- `trust_room_id`
- `room_views`
- `downloads`
- `requests_submitted`
- `access_granted`
- `top_sections`
- `follow_up_note`

## Product mapping

- Read from `TrustRoomEngagementEvent`.
- Correlate with `TrustRoomAccessRequest` status and request ownership.
- Surface summary in TrustOps room management and guided follow-up workflows.
