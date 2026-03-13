# Integration Pack Preflight

Date: 2026-03-12
Phase: Integration Pack Foundation

## Current dirty files

Existing protected worktree changes detected before this phase:

- `.agents/skills/README.md`
- `docs/demo-walkthrough-suite.md`
- `prisma/demo-seed.ts`
- `prisma/demo-suite-story.ts`
- `prisma/demo-support.ts`
- `prisma/schema.prisma`
- `scripts/local-full-validation.ts`
- `scripts/run-full-validation.ts`
- `src/app/api/copilot/route.ts`
- `src/app/app/command-center/page.tsx`
- `src/app/app/tools/page.tsx`
- `src/components/app/trust-packet-panel.tsx`
- `src/components/copilot-panel.tsx`
- `src/lib/product/contextual-help.ts`
- `src/lib/validation/trust.ts`
- `.agents/skills/vantage-buyer-engagement-summary/`
- `.agents/skills/vantage-demo-export-auditor/`
- `.agents/skills/vantage-demo-tenant-curator/`
- `.agents/skills/vantage-demo-walkthrough-planner/`
- `.agents/skills/vantage-external-request-triage/`
- `.agents/skills/vantage-trust-room-publisher/`
- `docs/demo-polish-pr.md`
- `docs/demo-polish-preflight.md`
- `docs/demo-polish-summary.md`
- `docs/demo-qa-checklist.md`
- `docs/trust-experience-pr.md`
- `docs/trust-experience-preflight.md`
- `docs/trust-experience-qa-checklist.md`
- `docs/trust-experience-summary.md`
- `prisma/migrations/20260312123000_external_trust_experience/`
- `src/app/api/trust/rooms/`
- `src/app/app/trust/rooms/`
- `src/app/trust-room/`
- `src/components/app/demo-path-card.tsx`
- `src/components/app/trust-room-panel.tsx`
- `src/components/trust/`
- `src/lib/demo/`
- `src/lib/trust/public-trust-room.ts`
- `src/lib/trust/trust-rooms.ts`
- `tests/demo-path.unit.test.ts`
- `tests/trust-room.unit.test.ts`

These changes are treated as protected and should not be reverted or reworked unless directly required for this phase.

## Existing patterns inspected

The current app already has clear patterns worth reusing:

- tenant-scoped durable records in Prisma
- audit logging via `src/lib/audit.ts`
- entitlement checks via `src/lib/billing/entitlements.ts`
- plan limits in `src/lib/billing/limits.ts`
- external client setup via environment-driven helpers like `src/lib/billing/stripe.ts`
- operator-first settings and workflow UI patterns in billing, TrustOps, Tools Hub, and Copilot
- share-safe export rendering patterns in `src/lib/trust/package-export.ts`

## Files expected to change

Likely additive change areas for this phase:

- `prisma/schema.prisma`
- new Prisma migration under `prisma/migrations/`
- `prisma/demo-seed.ts`
- `prisma/demo-suite-story.ts`
- new integration services under `src/lib/integrations/`
- new validation schema under `src/lib/validation/`
- new API routes under `src/app/api/integrations/`
- new operator UI under `src/app/app/settings/` and or `src/components/app/`
- `src/app/app/tools/page.tsx`
- `src/app/api/copilot/route.ts`
- `src/components/copilot-panel.tsx`
- `.agents/skills/README.md`
- new repo-local skills for connector workflows
- new or updated tests for connector services and validation harness coverage
- requested docs for summary, QA, setup, and PR notes

## Risks to avoid

- destabilizing the recent Trust Room, demo-path, Pulse, AI Governance, or Response Ops work
- building a generic integration platform instead of a narrow connector foundation
- storing secrets or full external credentials in plaintext fields or seed data
- weakening tenant scoping, auditability, or external-share boundaries
- introducing brittle two-way sync semantics for Jira or document systems
- pretending full provider completeness when only safe scaffolding is available
- coupling connector logic too tightly to one module when durable cross-module reuse is possible

## Items intentionally untouched

These areas should remain out of scope unless a narrow dependency requires a minimal touch:

- public marketing or trust-center CMS work
- billing checkout model changes
- large navigation refactors
- speculative Salesforce depth beyond a safe contract or stub
- broad auth rewrites or connector marketplace concepts
- replacing existing export engines where current HTML, Markdown, or JSON outputs are already stable

## Implementation stance

Use the smallest complete vertical slice:

1. durable connector records and safe secret pattern
2. Slack notifications
3. Jira outbound issue sync
4. document publishing for Confluence and Google Drive style destinations, with real implementation only where the local pattern is safe
5. connector health and operator activity visibility
6. guided launchers in Tools Hub and Copilot
