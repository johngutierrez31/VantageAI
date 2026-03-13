---
name: vantage-external-request-triage
description: Review and triage external buyer access requests for a Trust Room with explicit owner assignment, approval or denial status, and grant-link issuance when approved. Use when operators need a durable request-handling workflow tied to existing TrustOps records.
---

# Vantage External Request Triage

## Trigger conditions

- A buyer submits a Trust Room access request.
- TrustOps needs to assign an owner and capture internal notes before granting access.
- A seller needs a clear approved or denied outcome tied to the packet and request.

## Required behavior

1. Persist requests as durable `TrustRoomAccessRequest` records.
2. Link each request to the relevant `TrustRoom`, `TrustPacket`, `TrustInboxItem`, and questionnaire when those records exist.
3. Support `PENDING`, `APPROVED`, `DENIED`, and `FULFILLED` request states.
4. When approved, issue an explicit grant token or grant link instead of assuming open public access.
5. Keep internal notes internal and do not expose them externally.
6. Record access-grant outcomes in buyer engagement records for later follow-up.

## Structured output

- `request_id`
- `request_status`
- `assigned_owner_user_id`
- `internal_notes`
- `grant_url`
- `expires_at`

## Product mapping

- Persist to `TrustRoomAccessRequest`.
- Emit `ACCESS_GRANTED` engagement records when access is approved.
- Surface request review in TrustOps and guided launch workflows.
