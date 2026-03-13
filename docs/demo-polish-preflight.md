# Demo Polish Preflight

Date: 2026-03-12

## Current dirty files

- None. `git status --short` returned no changes at preflight time.

## Confirmed modules present

- TrustOps
- Pulse
- AI Governance
- Response Ops

## Files expected to change

- `prisma/demo-seed.ts`
- `prisma/demo-suite-story.ts`
- `prisma/demo-support.ts`
- `scripts/local-full-validation.ts` if demo reset or walkthrough verification needs minor polish
- `src/app/app/command-center/page.tsx`
- `src/app/app/tools/page.tsx`
- `src/components/app/command-center-operations.tsx`
- `src/components/app/pulse-dashboard-panel.tsx`
- `src/components/app/response-ops-dashboard-panel.tsx`
- `src/components/app/trust-packet-panel.tsx`
- `src/components/app/trust-inbox-detail-panel.tsx`
- `src/components/copilot-panel.tsx` if guided demo-path surfacing belongs there
- `.agents/skills/README.md`
- `.agents/skills/vantage-demo-tenant-curator/SKILL.md`
- `.agents/skills/vantage-demo-walkthrough-planner/SKILL.md`
- `.agents/skills/vantage-demo-export-auditor/SKILL.md`
- `docs/demo-walkthrough-suite.md`
- `docs/demo-qa-checklist.md`
- `docs/demo-polish-summary.md`
- `docs/demo-polish-pr.md`

## Risks to avoid

- Do not destabilize the existing multi-module flows that already pass local validation.
- Do not introduce a new module, billing workflow, or public-site surface.
- Do not add noisy or unrealistic seed volume; keep demo data compact and high-signal.
- Do not weaken tenant scoping, review gating, export safety, or audit-aware workflow behavior.
- Do not assume unsupported artifact types or export packaging that the current app does not implement.
- Do not refactor broadly when targeted demo polish can extend existing patterns.
- Keep Windows validation serial to avoid Prisma file locking false negatives.

## Items intentionally untouched

- Billing / checkout expansion
- Public marketing pages or side apps
- New Prisma schema changes unless a reset-stability bug makes one unavoidable
- Heavy analytics, reminder automation, or speculative framework work
- Any module not already confirmed locally
- Existing product navigation structure beyond additive demo-path guidance
