# Overlay Positioning PR Notes

## Summary

This PR adds an in-app `Adoption Mode` and a narrow import foundation so Vantage is easier to understand as the security operating layer that works with an existing stack.

## Why

- Reduce category confusion across TrustOps, Pulse, AI Governance, and Response Ops.
- Make the “work with your existing stack” story visible in-product.
- Give operators a practical path to onboard findings, risks, approved answers, and incidents.
- Show the cross-module carry-over path more clearly.

## Included

- `AdoptionImport` Prisma model and migration
- `Adoption Mode` page and import workflow
- Updated command center, tools hub, module framing, search, contextual help, and Copilot routing
- Demo-tenant seeded adoption imports
- New repo-local skills and walkthrough/QA docs
- Validation harness coverage for the new page and import flow

## Not included

- Direct competitor API migrations
- Bulk or historical data migration tooling
- New major modules
- Public marketing pages

## Reviewer focus

- Does the product now read as one operating layer rather than disconnected modules?
- Are import records clearly durable, scoped, and audit-aware?
- Does the adoption path stay honest about supported imports and connector behavior?
- Does the demo tenant support the new story without noisy seed volume?
