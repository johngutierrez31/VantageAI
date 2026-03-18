# Trial Experience Summary

## What was implemented

This pass separates the seeded demo workspace from a real 14-day trial workspace without changing the app into a separate demo shell or adding checkout logic.

Implemented in this pass:

- added a durable tenant-scoped workspace mode model with `DEMO`, `TRIAL`, and `PAID`
- added explicit trial lifecycle fields on `Tenant` for start date, end date, and status
- created a real trial provisioning route that creates a brand-new tenant, owner membership, branding record, and trial subscription state
- kept the paid tenant creation path separate from the trial path
- treated active trials as full-access through the existing entitlement pattern
- removed contradictory free-plan lockout messaging from trial billing and top-level product surfaces
- preserved the seeded demo tenant and marked it explicitly as `DEMO`
- made the app shell, Command Center, Tools Hub, and billing pages mode-aware
- added a concise first-run trial onboarding checklist tied to real questionnaire, Pulse, AI Governance, Response Ops, and policy/evidence records
- upgraded blank trial empty states across TrustOps, Pulse, AI Governance, Response Ops, Policies, and Findings
- added unit coverage for workspace mode helpers, trial provisioning, trial entitlements, and trial module commercial state
- added repo-local skills for future trial/demo separation work
- fixed two Pulse detail-page validation regressions and restored demo-only Command Center labels expected by the browser validation harness

## Changed files by purpose

### Workspace mode and trial lifecycle

- `prisma/schema.prisma`
- `prisma/migrations/20260317120000_trial_experience_workspace_mode/migration.sql`
- `src/lib/workspace-mode.ts`
- `src/lib/tenants/provision.ts`
- `src/lib/validation/trial.ts`
- `src/app/api/trial/start/route.ts`
- `src/app/api/tenants/create/route.ts`
- `prisma/demo-seed.ts`

### Entitlements, billing, and workspace chrome

- `src/lib/billing/entitlements.ts`
- `src/app/api/billing/subscription/route.ts`
- `src/components/billing-panel.tsx`
- `src/app/app/settings/billing/page.tsx`
- `src/lib/product/module-catalog.ts`
- `src/app/app/layout.tsx`
- `src/components/app/app-shell.tsx`

### Trial onboarding and empty states

- `src/lib/trial/onboarding.ts`
- `src/components/app/trial-onboarding-card.tsx`
- `src/app/app/command-center/page.tsx`
- `src/app/app/tools/page.tsx`
- `src/app/app/questionnaires/page.tsx`
- `src/components/app/questionnaire-uploads-panel.tsx`
- `src/app/app/trust/page.tsx`
- `src/app/app/pulse/page.tsx`
- `src/app/app/ai-governance/page.tsx`
- `src/app/app/response-ops/page.tsx`
- `src/app/app/policies/page.tsx`
- `src/app/app/findings/page.tsx`
- `src/components/app/pulse-dashboard-panel.tsx`
- `src/components/app/ai-governance-dashboard-panel.tsx`
- `src/components/app/response-ops-dashboard-panel.tsx`
- `src/components/app/trust-packet-panel.tsx`
- `src/components/app/policy-generator-panel.tsx`

### Public entry and trial start

- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/components/login-form.tsx`
- `src/components/trial-start-form.tsx`

### Demo separation and validation hardening

- `src/app/trust-room/[slug]/page.tsx`
- `src/app/app/pulse/board-briefs/[id]/page.tsx`
- `src/app/app/pulse/quarterly-reviews/[id]/page.tsx`
- `src/components/app/demo-path-card.tsx`
- `src/components/app/command-center-operations.tsx`

### Tests

- `tests/workspace-mode.unit.test.ts`
- `tests/trial-provisioning.unit.test.ts`
- `tests/trial-entitlements.unit.test.ts`
- `tests/trial-module-catalog.unit.test.ts`

### Skills and docs

- `.agents/skills/README.md`
- `.agents/skills/vantage-trial-workspace-provisioner/SKILL.md`
- `.agents/skills/vantage-trial-onboarding-planner/SKILL.md`
- `.agents/skills/vantage-trial-empty-state-writer/SKILL.md`
- `.agents/skills/vantage-demo-vs-trial-mode-auditor/SKILL.md`
- `docs/trial-experience-preflight.md`
- `docs/trial-experience-summary.md`
- `docs/trial-experience-qa-checklist.md`
- `docs/trial-experience-pr.md`
- `docs/trial-vs-demo-behavior.md`

## What is now true

- demo mode stays seeded, story-driven, and suitable for internal or sales walkthroughs
- trial mode creates a blank tenant with 14-day full access and trial-aware onboarding
- paid mode stays on the standard entitlement path without demo-first language

## Deferred

- opt-in sample trial data import remains deferred in this pass
- no Stripe checkout or paid conversion flow was added
- no major app-shell redesign or new module was introduced
