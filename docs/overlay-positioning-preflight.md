# Overlay Positioning Preflight

Date: 2026-03-12
Phase: Overlay Positioning

## Current dirty files

Protected existing worktree changes observed before this phase:

- `.agents/skills/README.md`
- `docs/demo-walkthrough-suite.md`
- `prisma/demo-seed.ts`
- `prisma/demo-suite-story.ts`
- `prisma/demo-support.ts`
- `prisma/schema.prisma`
- `scripts/local-full-validation.ts`
- `scripts/run-full-validation.ts`
- `src/app/api/copilot/route.ts`
- `src/app/api/pulse/quarterly-reviews/route.ts`
- `src/app/api/response-ops/incidents/route.ts`
- `src/app/app/command-center/page.tsx`
- `src/app/app/layout.tsx`
- `src/app/app/settings/billing/page.tsx`
- `src/app/app/settings/members/page.tsx`
- `src/app/app/tools/page.tsx`
- `src/components/app/trust-packet-panel.tsx`
- `src/components/copilot-panel.tsx`
- `src/lib/product/contextual-help.ts`
- `src/lib/validation/trust.ts`
- existing untracked demo, trust-room, and integration-pack files already present locally

## Inspection focus completed

Reviewed the current wording and onboarding seams across:

- `src/app/app/command-center/page.tsx`
- `src/app/app/tools/page.tsx`
- `src/app/app/layout.tsx`
- `src/lib/product/module-catalog.ts`
- `src/app/app/trust/page.tsx`
- `src/app/app/pulse/page.tsx`
- `src/app/app/response-ops/page.tsx`
- `src/app/app/ai-governance/page.tsx`
- the major dashboard and workflow panels for those module entry pages

## Files expected to change

- `prisma/schema.prisma`
- `prisma/demo-support.ts`
- `prisma/demo-suite-story.ts`
- `scripts/local-full-validation.ts`
- `src/app/app/command-center/page.tsx`
- `src/app/app/tools/page.tsx`
- `src/app/app/layout.tsx`
- `src/app/api/copilot/route.ts`
- `src/components/copilot-panel.tsx`
- `src/lib/product/module-catalog.ts`
- module landing pages and panels that need clearer category and start-here framing
- a new lightweight adoption/import workflow surface and supporting routes/services
- repo-local skills and docs for adoption mode, value-path explanation, and import planning

## Risks to avoid

- do not make the app feel like a disconnected product rename exercise
- do not overclaim imports or connector-assisted adoption paths that are not implemented
- do not destabilize the recent demo, trust-room, or integration-pack work
- do not hide the existing module identities under vague platform language
- do not introduce a heavyweight migration framework or speculative competitor imports
- keep any new records tenant-scoped, audit-aware, and additive

## Items intentionally untouched

- public-site or marketing-site work outside the authenticated app
- new major modules
- billing architecture
- deep connector expansion beyond the current narrow foundation
- speculative refactors of app shell, auth, or module architecture

## Implementation stance

Keep this pass narrow and product-clarifying:

- clarify module roles and where-to-start cues
- add an in-app adoption-mode surface that explains how Vantage works with the existing stack
- add a lightweight durable import framework for practical manual and CSV-assisted onboarding
- make cross-module carry-over and value flow easier to follow from Command Center, Tools Hub, and module entry pages
