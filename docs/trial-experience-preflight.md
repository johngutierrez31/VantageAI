# Trial Experience Preflight

## Goal

Separate demo mode from a real 14-day full-access trial so a new trial user lands in a blank, tenant-scoped workspace with guided first-run onboarding instead of seeded demo data, demo copy, or free-plan friction.

## Current dirty files

These files were already modified before this pass and overlap trial-sensitive surfaces, so they must be treated as existing work:

- `prisma/demo-seed.ts`
- `prisma/demo-suite-story.ts`
- `prisma/demo-support.ts`
- `src/app/app/command-center/page.tsx`
- `src/app/app/layout.tsx`
- `src/app/app/loading.tsx`
- `src/app/app/settings/members/page.tsx`
- `src/app/layout.tsx`
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- `src/app/trust-room/[slug]/page.tsx`
- `src/components/app/ai-governance-dashboard-panel.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/command-center-operations.tsx`
- `src/components/app/contextual-help-panel.tsx`
- `src/components/app/demo-path-card.tsx`
- `src/components/app/empty-state.tsx`
- `src/components/app/page-header.tsx`
- `src/components/app/pulse-dashboard-panel.tsx`
- `src/components/app/questionnaire-uploads-panel.tsx`
- `src/components/app/trust-inbox-panel.tsx`
- `src/components/app/trust-packet-panel.tsx`
- `src/components/login-form.tsx`
- `src/components/trust/public-trust-room.tsx`
- `src/lib/auth/demo.ts`
- `src/lib/auth/session.ts`
- `src/lib/demo/demo-path.ts`

## Repo context read before implementation

- `AGENTS.md`
- `PLANS.md`
- current sprint summary / QA / PR docs under `docs/`
- current final-hardening docs under `docs/`
- repo-local skills catalog and repo-local skills under `.agents/skills/`

## Current state findings

### Tenant and workspace state handling

- `Tenant` currently has no durable workspace mode field in `prisma/schema.prisma`.
- `Subscription` currently carries plan and billing status, but not trial lifecycle or demo-vs-trial intent.
- Auth/session resolution is membership-scoped, but demo fallback is global environment driven in `src/lib/auth/session.ts` and `src/lib/auth/demo.ts`.
- A real tenant creation route already exists at `src/app/api/tenants/create/route.ts`, but sign-in currently requires an existing active membership in `src/lib/auth/options.ts`, so first-time trial entry is not fully wired into access.

### Demo assumptions currently in product flow

- Demo mode can bypass normal auth and session expectations when `DEMO_MODE=true`.
- Demo seed/reset is the default seeded workspace path via `prisma/seed.ts` and `prisma/demo-seed.ts`.
- Command Center explicitly renders demo-first affordances, including `Demo Workspace` copy and `DemoPathCard`.
- Tools Hub always loads `DemoPathCard`, Adoption framing, current plan, and packaging-aware module cards.
- Login and home pages explicitly advertise opening the demo workspace.
- Public trust-room pages show synthetic demo messaging based on environment-level demo mode.

### Billing and entitlement assumptions

- `getTenantEntitlements` falls back to `FREE` when no subscription exists or billing status is inactive.
- Billing UI still presents plan state primarily as plan tier plus feature toggles such as `AI: Enabled/Disabled` and `PDF Export: Enabled/Disabled`.
- Module commercial state is packaging-heavy by default through `src/lib/product/module-catalog.ts`.
- Tools Hub and contextual help currently encourage packaging and demo conversations even on top-level product entry surfaces.

### Onboarding and first-run state

- There is no durable trial-specific onboarding/checklist record yet.
- Existing “Start here” patterns exist across module pages and Adoption Mode, but the top-level workspace still assumes either demo storytelling or packaging/orientation language rather than blank-trial activation.
- Existing empty-state infrastructure can likely be extended rather than replaced.

## Trial-vs-demo confusion points

- Demo mode is currently environment-scoped, while the requested behavior needs tenant/workspace-scoped mode.
- A tenant without a subscription is treated as `FREE`, which undermines a full-access trial unless trial state overrides entitlements cleanly.
- The app currently mixes real-workspace messaging with demo entry points on `/`, `/login`, Command Center, and Tools Hub.
- Demo seed/reset and demo walkthrough affordances are visible from the same top-level surfaces trial users would first reach.
- Module packaging badges and “review packaging” CTAs are currently prominent even when a user should be evaluating the full suite hands-on.
- Existing sign-in flow assumes a pre-provisioned membership, which blocks a clean “request a trial, get a new workspace, enter immediately” path unless provisioning is extended.

## Files expected to change

### Data model and tenant state

- `prisma/schema.prisma`
- `prisma/migrations/*trial_experience*`
- `src/lib/billing/entitlements.ts`
- `src/lib/billing/limits.ts`
- new trial/workspace-mode helper under `src/lib/`

### Auth, session, and provisioning

- `src/lib/auth/options.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/demo.ts`
- `src/app/api/tenants/create/route.ts`
- likely new trial provisioning route(s) under `src/app/api/`
- `src/lib/validation/tenant.ts`

### Demo preservation and seed separation

- `prisma/seed.ts`
- `prisma/demo-seed.ts`
- `prisma/demo-support.ts`
- `src/lib/demo/demo-path.ts`

### Top-level workspace UX

- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/components/login-form.tsx`
- `src/app/app/layout.tsx`
- `src/components/app/app-shell.tsx`
- `src/app/app/command-center/page.tsx`
- `src/app/app/tools/page.tsx`
- `src/app/app/settings/billing/page.tsx`
- `src/components/billing-panel.tsx`
- `src/lib/product/module-catalog.ts`
- `src/lib/product/contextual-help.ts`

### Trial onboarding and empty states

- `src/components/app/empty-state.tsx`
- TrustOps, Pulse, AI Governance, Response Ops, Policies, and Findings entry panels/pages that currently dead-end or lean demo-first
- likely new trial onboarding/checklist UI and supporting tenant-scoped data model

### Skills and docs required by this phase

- `.agents/skills/README.md`
- new or updated repo-local skills for trial workspace provisioning, onboarding, empty states, and demo-vs-trial auditing
- `docs/trial-experience-summary.md`
- `docs/trial-experience-qa-checklist.md`
- `docs/trial-experience-pr.md`
- `docs/trial-vs-demo-behavior.md`

### Tests and validation

- relevant unit/integration tests for tenant provisioning, entitlements, billing state, and top-level UX
- `scripts/local-full-validation.ts` or adjacent validation coverage if trial flow needs to be exercised there

## Risks to avoid

- Do not reuse the demo tenant as a fake trial.
- Do not make demo-mode behavior depend only on global environment state if the product now needs per-tenant mode.
- Do not break current demo reset, demo walkthrough, or seeded story paths used for sales/demo work.
- Do not introduce destructive Prisma changes or tenant-wide rewrites that would jeopardize current data.
- Do not let trial entitlements change paid-tenant logic or Stripe webhook behavior.
- Do not expose demo copy, demo data, or packaging-heavy CTAs inside trial workspaces.
- Do not weaken tenant scoping, audit logging, or reviewer/owner integrity in onboarding workflows.
- Do not silently clobber the existing user edits already present in overlapping files.

## Items intentionally untouched unless required by a blocker

- Stripe checkout architecture beyond using current subscription patterns cleanly
- full paid conversion or checkout redesign
- major app-shell rewrite
- new major modules
- destructive demo-data/schema cleanup
- deep connector or trust-room changes unrelated to trial-mode gating
- broad marketing-document rewrites outside the required phase docs

## Minimal safe implementation direction

- Add a durable tenant-scoped workspace mode and trial lifecycle fields.
- Extend the existing tenant creation path into a real trial provisioning path instead of inventing a second app.
- Make trial entitlements explicit and full-access for 14 days without changing paid-plan semantics.
- Gate demo path, packaging cues, and demo copy off for trial tenants while preserving them for demo tenants.
- Reuse existing start-here patterns and durable workflows for the blank-trial onboarding checklist and module empty states.
