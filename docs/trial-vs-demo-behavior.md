# Trial vs Demo Behavior

## Demo mode

Purpose:

- internal walkthroughs
- sales storytelling
- showing a coherent cross-module example

Behavior:

- uses the seeded demo tenant
- contains sample TrustOps, Pulse, AI Governance, and Response Ops data
- may show guided demo copy and demo path cards
- may show packaging-oriented language where helpful for demos

## Trial mode

Purpose:

- real hands-on evaluation in a clean workspace

Behavior:

- provisions a brand-new tenant
- sets `workspaceMode=TRIAL`
- stores `trialStartedAt`, `trialEndsAt`, and `trialStatus`
- grants full-suite access for 14 days through the current entitlement path
- starts blank by default with no seeded operational artifacts
- shows trial countdown and concise first-run onboarding
- hides demo-story language and suppresses undermining free-plan lockout copy

## Paid mode

Purpose:

- normal tenant operation after trial or for standard customer workspaces

Behavior:

- uses `workspaceMode=PAID`
- follows the standard entitlement and subscription path
- does not show demo-only copy
- does not show trial-only countdown or onboarding

## Rules that should stay true

- never reuse the demo tenant as a fake trial
- never leak seeded demo artifacts into a trial tenant
- never show active-trial users contradictory AI-disabled or PDF-disabled messaging
- keep demo, trial, and paid behavior tenant-scoped and durable

## Deferred in this phase

- optional sample workspace import for trial users
- checkout and paid conversion logic
