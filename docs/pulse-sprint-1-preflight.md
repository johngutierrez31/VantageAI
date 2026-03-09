# Pulse Sprint 1 Preflight

## Current dirty files

This worktree already contains valid local TrustOps Sprint 1 and Sprint 2 changes. Treat them as protected.

Modified tracked files observed before Pulse work:

- `.agents/skills/README.md`
- `package.json`
- `prisma/demo-seed.ts`
- `prisma/schema.prisma`
- `scripts/local-full-validation.ts`
- `src/app/api/copilot/route.ts`
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
- `src/lib/intel/pulse.ts`
- `src/lib/questionnaire/drafting.ts`
- `src/lib/questionnaire/export.ts`
- `src/lib/questionnaire/mapping.ts`
- `src/lib/validation/questionnaire.ts`
- `src/lib/validation/trust.ts`
- `src/lib/validation/workflow.ts`
- `tests/intel-brief.integration.test.ts`
- `tests/intel-pulse-plan.integration.test.ts`

Untracked TrustOps files already present before Pulse work:

- `AGENTS.md`
- `PLANS.md`
- `docs/codex-skills-setup.md`
- `docs/marketing-handoff-trustops.md`
- `docs/marketing-handoff-trustops-sprint-2.md`
- `docs/trustops-sprint-1-summary.md`
- `docs/trustops-sprint-1-qa-checklist.md`
- `docs/trustops-sprint-1-pr.md`
- `docs/trustops-sprint-2-summary.md`
- `docs/trustops-sprint-2-qa-checklist.md`
- `docs/trustops-sprint-2-pr.md`
- `prisma/migrations/20260306120000_trustops_sprint_1/`
- `prisma/migrations/20260308001000_trustops_sprint_2/`
- `prisma/migrations/migration_lock.toml`
- `.agents/skills/vantage-ai-use-case-review/`
- `.agents/skills/vantage-answer-library-curator/`
- `.agents/skills/vantage-board-brief-generator/`
- `.agents/skills/vantage-evidence-map-builder/`
- `.agents/skills/vantage-questionnaire-responder/`
- `.agents/skills/vantage-review-queue-manager/`
- `.agents/skills/vantage-trust-packet-builder/`
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
- `tests/trustops-drafting.integration.test.ts`
- `tests/trustops-evidence-map.integration.test.ts`
- `tests/trustops-export.integration.test.ts`
- `tests/trustops-findings.integration.test.ts`
- `tests/trustops-package-export.integration.test.ts`
- `tests/trustops-packets.integration.test.ts`
- `tests/trustops-review-queue.integration.test.ts`

## Files expected to change for Pulse Sprint 1

Additive schema, routes, services, UI, skills, docs, and tests are expected in these areas:

- `prisma/schema.prisma`
- `prisma/demo-seed.ts`
- `prisma/migrations/20260308*_pulse_sprint_1/`
- `src/lib/intel/pulse.ts`
- `src/lib/assessment/metrics.ts`
- `src/lib/validation/`
- `src/lib/pulse/`
- `src/app/api/pulse/`
- `src/app/api/risks/`
- `src/app/api/roadmap/`
- `src/app/api/board-briefs/`
- `src/app/api/quarterly-reviews/`
- `src/app/api/copilot/route.ts`
- `src/app/app/command-center/page.tsx`
- `src/app/app/tools/page.tsx`
- `src/app/app/pulse/`
- `src/app/app/findings/page.tsx`
- `src/components/app/`
- `.agents/skills/vantage-board-brief-generator/SKILL.md`
- `.agents/skills/vantage-risk-register-curator/`
- `.agents/skills/vantage-roadmap-planner/`
- `.agents/skills/vantage-quarterly-review-prep/`
- `.agents/skills/README.md`
- `scripts/local-full-validation.ts`
- `tests/`
- `docs/pulse-sprint-1-summary.md`
- `docs/pulse-sprint-1-qa-checklist.md`
- `docs/pulse-sprint-1-pr.md`
- `docs/marketing-handoff-pulse-sprint-1.md`

## Risks to avoid

- Do not overwrite or revert any TrustOps Sprint 1 or Sprint 2 file content.
- Do not rename or restructure existing TrustOps routes unless a narrow additive extension is impossible.
- Do not create a separate Pulse app or parallel navigation model.
- Do not create destructive Prisma changes; use additive models and nullable links.
- Do not duplicate findings, tasks, or trust review concepts where existing models already work.
- Do not make Pulse scoring opaque; every score must map back to measured in-app signals.
- Do not leak internal-only TrustOps notes into executive exports or shareable artifacts.
- Do not run `build` and `test:full` in parallel on Windows because Prisma DLL locking is already known.
- Do not let Copilot or workflow generators fabricate risks, scores, or evidence support.

## Items intentionally left untouched

These areas are out of scope for Pulse Sprint 1 unless a minimal compatibility fix is required:

- TrustOps questionnaire import, drafting, review, answer-library, evidence-map, packet, and review-queue core behavior
- AI Governance persistence and approval workflows
- Response Ops incident record and first-hour workflow expansion
- Billing and entitlement architecture beyond reuse of current patterns
- App shell rewrite or major navigation redesign
- Marketing site implementation in the separate `vantageciso` repository
- Heavy analytics, BI-style dashboards, or Pulse Sprint 2 historical analysis work
