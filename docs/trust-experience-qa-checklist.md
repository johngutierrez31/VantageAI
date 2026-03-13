# Trust Experience QA Checklist

Date: 2026-03-12

## Core Publishing

- Run `npm.cmd run demo:reset`.
- Open `/app/trust`.
- Confirm `Trust Rooms` is visible from TrustOps.
- Open `/app/trust/rooms`.
- Publish or republish a room from an `EXTERNAL_SHARE` packet.
- Confirm buyer-safe section selection is required.
- Confirm protected-link rotation returns a new share URL.

## Public Room Experience

- Open `/trust-room/northbridge-payments-room`.
- Confirm the room does not expose full content before access is granted.
- Open `/trust-room/northbridge-payments-room?grant=northbridge-buyer-grant-demo`.
- Confirm acknowledgement is required.
- Open `/trust-room/northbridge-payments-room?grant=northbridge-buyer-grant-demo&ack=1`.
- Confirm the buyer-facing room loads approved sections only.
- Confirm HTML, Markdown, and JSON downloads work from the room.

## Request Flow

- Open the request-gated room without a grant token.
- Submit an access request.
- Return to `/app/trust/rooms`.
- Confirm the request appears with status, owner assignment, and internal notes fields.
- Approve the request and confirm a grant URL is returned.
- Deny a separate request and confirm no grant URL is returned.

## Engagement Analytics

- Open several room sections from the buyer-facing room.
- Download the packet once.
- Return to `/app/trust/rooms`.
- Confirm room views, downloads, request counts, and top sections update or seed correctly.

## Safety Checks

- Confirm internal notes never appear in the public room.
- Confirm request-gated rooms do not open without a valid grant token.
- Confirm internal-review rooms show a non-public holding page externally.
- Confirm the room only includes approved packet sections.

## Serial Validation

Run in order:

1. `npx.cmd prisma migrate deploy`
2. `npm.cmd run demo:reset`
3. `npm.cmd run typecheck`
4. `npm.cmd run lint`
5. `npm.cmd run test`
6. `npm.cmd run build`
7. `npm.cmd run test:full`
