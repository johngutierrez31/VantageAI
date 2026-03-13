# Trust Experience Summary

Date: 2026-03-12
Phase: External Trust Experience

## What Was Implemented

- Added durable buyer-facing Trust Room publishing on top of existing TrustOps packets.
- Added room access modes for:
  - internal review only
  - protected link
  - gated access request
- Added public Trust Room routes outside authenticated `/app` and `/api` surfaces:
  - `/trust-room/[slug]`
  - `/trust-room/[slug]/request`
  - `/trust-room/[slug]/event`
  - `/trust-room/[slug]/download`
- Added durable external request handling with owner assignment, internal notes, approval or denial state, and grant-link issuance.
- Added narrow buyer engagement tracking for:
  - room viewed
  - section viewed
  - packet downloaded
  - request submitted
  - access granted
- Added internal TrustOps room management at `/app/trust/rooms`.
- Added guided launcher surfacing in TrustOps, Tools Hub, and Copilot recommendations.

## Data Model Additions

- `TrustRoom`
- `TrustRoomAccessRequest`
- `TrustRoomEngagementEvent`
- `TrustRoomStatus`
- `TrustRoomAccessMode`
- `TrustRoomAccessRequestStatus`
- `TrustRoomEngagementEventType`

## Safety Boundaries Preserved

- Public room content reuses the persisted Trust Packet manifest rather than exposing raw internal records.
- Internal notes, reviewer comments, and unapproved materials remain excluded from buyer-facing output.
- External room modes require explicit packet readiness before buyer-facing publication.
- Request-gated access is granted through explicit approved tokens instead of opening the room globally.

## Demo-Tenant Seed Additions

- Seeded published room:
  - slug: `northbridge-payments-room`
  - mode: `REQUEST_ACCESS`
- Seeded fulfilled access request:
  - requester: `Nadia Gomez`
  - demo grant token: `northbridge-buyer-grant-demo`
- Seeded pending access request:
  - requester: `Olivia Hart`
- Seeded engagement events across room view, section view, packet download, request submission, and access grant

## Demo URL

Use the seeded approved room link locally after `npm.cmd run demo:reset`:

- `/trust-room/northbridge-payments-room?grant=northbridge-buyer-grant-demo`

If terms acknowledgement is enabled, continue with:

- `/trust-room/northbridge-payments-room?grant=northbridge-buyer-grant-demo&ack=1`

## Validation Status

Passed serially:

1. `npx.cmd prisma migrate deploy`
2. `npm.cmd run demo:reset`
3. `npm.cmd run typecheck`
4. `npm.cmd run lint`
5. `npm.cmd run test`
6. `npm.cmd run build`
7. `npm.cmd run test:full`

Additional hardening:

- Updated `scripts/run-full-validation.ts` so the full local validation harness keeps `BASE_URL` aligned with the actual open port instead of drifting when port `3000` is already occupied.
