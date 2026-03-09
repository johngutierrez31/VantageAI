# Final Hardening Preflight

## Confirmed modules present locally

The current protected worktree includes local implementations for all four planned modules:

- TrustOps
- Pulse
- AI Governance
- Response Ops

AI Governance is confirmed present locally through:

- `docs/ai-governance-sprint-1-*.md`
- `src/app/api/ai-governance/`
- `src/app/app/ai-governance/`
- `src/lib/ai-governance/`

## Current dirty files

This worktree is intentionally dirty with valid local module work. Treat the existing work as protected.

### Modified tracked files already present before this pass

- `.agents/skills/README.md`
- `package.json`
- `prisma/demo-seed.ts`
- `prisma/schema.prisma`
- `scripts/local-full-validation.ts`
- `src/app/api/copilot/route.ts`
- `src/app/api/intel/runbooks/route.ts`
- `src/app/api/questionnaires/[id]/draft/route.ts`
- `src/app/api/questionnaires/[id]/export/route.ts`
- `src/app/api/questionnaires/[id]/map/route.ts`
- `src/app/api/questionnaires/[id]/route.ts`
- `src/app/api/questionnaires/route.ts`
- `src/app/api/questionnaires/upload/route.ts`
- `src/app/api/trust/inbox/[id]/export/route.ts`
- `src/app/api/trust/inbox/[id]/route.ts`
- `src/app/app/command-center/page.tsx`
- `src/app/app/findings/page.tsx`
- `src/app/app/layout.tsx`
- `src/app/app/questionnaires/[id]/page.tsx`
- `src/app/app/questionnaires/page.tsx`
- `src/app/app/tools/page.tsx`
- `src/app/app/trust/inbox/[id]/page.tsx`
- `src/app/app/trust/page.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/findings-workbench.tsx`
- `src/components/app/questionnaire-detail-panel.tsx`
- `src/components/app/questionnaire-uploads-panel.tsx`
- `src/components/app/status-pill.tsx`
- `src/components/app/trust-inbox-detail-panel.tsx`
- `src/components/app/trust-packet-panel.tsx`
- `src/components/copilot-panel.tsx`
- `src/lib/intel/brief.ts`
- `src/lib/intel/pulse.ts`
- `src/lib/intel/runbooks.ts`
- `src/lib/questionnaire/drafting.ts`
- `src/lib/questionnaire/export.ts`
- `src/lib/questionnaire/mapping.ts`
- `src/lib/validation/questionnaire.ts`
- `src/lib/validation/trust.ts`
- `src/lib/validation/workflow.ts`
- `tests/intel-brief.integration.test.ts`
- `tests/intel-pulse-plan.integration.test.ts`

### Protected untracked files already present before this pass

Protected untracked work already exists in these grouped areas:

- repo guidance:
  - `AGENTS.md`
  - `PLANS.md`
- release and marketing docs:
  - `docs/trustops-sprint-1-*`
  - `docs/trustops-sprint-2-*`
  - `docs/pulse-sprint-1-*`
  - `docs/ai-governance-sprint-1-*`
  - `docs/response-ops-sprint-1-*`
  - `docs/marketing-handoff-*`
  - `docs/codex-skills-setup.md`
- repo-local skills:
  - `.agents/skills/vantage-*`
- migrations:
  - `prisma/migrations/20260306120000_trustops_sprint_1/`
  - `prisma/migrations/20260308001000_trustops_sprint_2/`
  - `prisma/migrations/20260308103000_pulse_sprint_1/`
  - `prisma/migrations/20260308150000_ai_governance_sprint_1/`
  - `prisma/migrations/20260308193000_response_ops_sprint_1/`
  - `prisma/migrations/migration_lock.toml`
- TrustOps implementation:
  - `src/app/api/answer-library/`
  - `src/app/api/evidence-maps/`
  - `src/app/api/findings/`
  - `src/app/api/questionnaires/[id]/assignment/`
  - `src/app/api/questionnaires/[id]/evidence-map/`
  - `src/app/api/questionnaires/[id]/review/`
  - `src/app/api/trust/packets/`
  - `src/app/app/trust/answer-library/`
  - `src/app/app/trust/evidence-maps/`
  - `src/app/app/trust/reviews/`
  - `src/components/app/answer-library-panel.tsx`
  - `src/components/app/evidence-map-detail-panel.tsx`
  - `src/components/app/trust-review-queue-panel.tsx`
  - `src/lib/trust/`
  - `tests/trustops-*.test.ts`
- Pulse implementation:
  - `src/app/api/pulse/`
  - `src/app/app/pulse/`
  - `src/components/app/pulse-dashboard-panel.tsx`
  - `src/components/app/risk-register-panel.tsx`
  - `src/components/app/pulse-roadmap-panel.tsx`
  - `src/components/app/pulse-snapshot-detail-panel.tsx`
  - `src/components/app/board-brief-detail-panel.tsx`
  - `src/components/app/quarterly-review-detail-panel.tsx`
  - `src/lib/pulse/`
  - `src/lib/validation/pulse.ts`
  - `tests/pulse-*.test.ts`
- AI Governance implementation:
  - `src/app/api/ai-governance/`
  - `src/app/app/ai-governance/`
  - `src/components/app/ai-governance-dashboard-panel.tsx`
  - `src/components/app/ai-use-case-registry-panel.tsx`
  - `src/components/app/ai-use-case-detail-panel.tsx`
  - `src/components/app/ai-vendor-review-panel.tsx`
  - `src/components/app/ai-vendor-review-detail-panel.tsx`
  - `src/components/app/ai-review-queue-panel.tsx`
  - `src/lib/ai-governance/`
  - `src/lib/validation/ai-governance.ts`
  - `tests/ai-governance-*.test.ts`
- Response Ops implementation:
  - `src/app/api/response-ops/`
  - `src/app/app/response-ops/`
  - `src/components/app/response-ops-dashboard-panel.tsx`
  - `src/components/app/incident-detail-panel.tsx`
  - `src/components/app/tabletop-detail-panel.tsx`
  - `src/lib/response-ops/`
  - `src/lib/validation/response-ops.ts`
  - `tests/response-ops-*.test.ts`

## Files expected to change in this final pass

The final hardening pass should stay narrow and additive. Expected touch-points:

- navigation, naming, and suite framing:
  - `src/components/app/app-shell.tsx`
  - `src/app/app/layout.tsx`
  - `src/components/app/page-header.tsx`
  - `src/app/app/command-center/page.tsx`
  - `src/app/app/tools/page.tsx`
  - `src/app/api/copilot/route.ts`
  - `src/components/copilot-panel.tsx`
- commercialization scaffolding:
  - `src/lib/billing/entitlements.ts`
  - `src/lib/billing/limits.ts`
  - `src/components/billing-panel.tsx`
  - `src/app/app/settings/billing/page.tsx`
  - a small shared product metadata helper if needed
- cross-module linking and operator polish:
  - `src/app/app/findings/page.tsx`
  - `src/components/app/findings-workbench.tsx`
  - `src/components/app/pulse-dashboard-panel.tsx`
  - `src/components/app/ai-governance-dashboard-panel.tsx`
  - `src/components/app/response-ops-dashboard-panel.tsx`
  - `src/components/app/trust-packet-panel.tsx`
  - `src/components/app/questionnaire-detail-panel.tsx`
- export and share polish:
  - `src/lib/trust/package-export.ts`
  - `src/lib/pulse/export.ts`
  - `src/lib/response-ops/export.ts`
  - `src/app/api/trust/packets/[id]/export/route.ts`
  - `src/app/api/pulse/board-briefs/[id]/export/route.ts`
  - `src/app/api/response-ops/after-action/[reportId]/export/route.ts`
  - a shared export/file-naming helper if needed
- demo seed and walkthrough readiness:
  - `prisma/demo-seed.ts`
  - `scripts/local-full-validation.ts`
  - `docs/demo-walkthrough-suite.md`
- release docs:
  - `docs/final-hardening-summary.md`
  - `docs/final-hardening-qa-checklist.md`
  - `docs/final-hardening-pr.md`
  - `docs/marketing-handoff-suite-launch.md`
- tests:
  - targeted additions only where cross-module confidence materially improves

## Risks to avoid

- Do not overwrite, revert, rename, or destabilize any existing TrustOps, Pulse, AI Governance, or Response Ops work.
- Do not introduce destructive Prisma changes.
- Do not add a new major module or re-scope existing modules.
- Do not build parallel entitlement or packaging systems when existing billing helpers already exist.
- Do not weaken tenant scoping, review gating, or audit logging.
- Do not leak internal-only notes into export/share flows.
- Do not let commercialization copy imply billing behavior that the product does not actually enforce yet.
- Do not turn this pass into a visual redesign or large architecture refactor.
- Do not run `build` and `test:full` in parallel on Windows because Prisma DLL locking remains a known constraint.

## Items intentionally left untouched

These areas are intentionally out of scope unless a narrow compatibility fix is required:

- major new module work
- Pulse Sprint 2 analytics depth
- AI Governance Sprint 2 workflows
- Response Ops Sprint 2 escalation/reminder features
- billing checkout redesign or subscription logic expansion
- public marketing site implementation in the separate `vantageciso` repository
- speculative schema cleanup unrelated to launch readiness
