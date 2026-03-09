# Response Ops Sprint 1 Preflight

## Current dirty files

This worktree already contains valid local TrustOps Sprint 1, TrustOps Sprint 2, Pulse Sprint 1, and AI Governance Sprint 1 changes. Treat all of that work as protected.

Modified tracked files observed before Response Ops work:

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

Untracked protected local files already present before Response Ops work:

- `AGENTS.md`
- `PLANS.md`
- `docs/codex-skills-setup.md`
- `docs/trustops-sprint-1-summary.md`
- `docs/trustops-sprint-1-qa-checklist.md`
- `docs/trustops-sprint-1-pr.md`
- `docs/trustops-sprint-2-summary.md`
- `docs/trustops-sprint-2-qa-checklist.md`
- `docs/trustops-sprint-2-pr.md`
- `docs/pulse-sprint-1-preflight.md`
- `docs/pulse-sprint-1-summary.md`
- `docs/pulse-sprint-1-qa-checklist.md`
- `docs/pulse-sprint-1-pr.md`
- `docs/ai-governance-sprint-1-preflight.md`
- `docs/ai-governance-sprint-1-summary.md`
- `docs/ai-governance-sprint-1-qa-checklist.md`
- `docs/ai-governance-sprint-1-pr.md`
- `docs/marketing-handoff-trustops.md`
- `docs/marketing-handoff-trustops-sprint-2.md`
- `docs/marketing-handoff-pulse-sprint-1.md`
- `docs/marketing-handoff-ai-governance-sprint-1.md`
- `prisma/migrations/20260306120000_trustops_sprint_1/`
- `prisma/migrations/20260308001000_trustops_sprint_2/`
- `prisma/migrations/20260308103000_pulse_sprint_1/`
- `prisma/migrations/20260308150000_ai_governance_sprint_1/`
- `prisma/migrations/migration_lock.toml`
- `.agents/skills/vantage-ai-governance-summary/`
- `.agents/skills/vantage-ai-policy-mapper/`
- `.agents/skills/vantage-ai-use-case-review/`
- `.agents/skills/vantage-ai-vendor-intake/`
- `.agents/skills/vantage-answer-library-curator/`
- `.agents/skills/vantage-board-brief-generator/`
- `.agents/skills/vantage-evidence-map-builder/`
- `.agents/skills/vantage-quarterly-review-prep/`
- `.agents/skills/vantage-questionnaire-responder/`
- `.agents/skills/vantage-review-queue-manager/`
- `.agents/skills/vantage-risk-register-curator/`
- `.agents/skills/vantage-roadmap-planner/`
- `.agents/skills/vantage-trust-packet-builder/`
- `src/app/api/ai-governance/`
- `src/app/api/answer-library/`
- `src/app/api/evidence-maps/`
- `src/app/api/findings/`
- `src/app/api/pulse/`
- `src/app/api/questionnaires/[id]/assignment/`
- `src/app/api/questionnaires/[id]/evidence-map/`
- `src/app/api/questionnaires/[id]/review/`
- `src/app/api/trust/packets/`
- `src/app/app/ai-governance/`
- `src/app/app/pulse/`
- `src/app/app/trust/answer-library/`
- `src/app/app/trust/evidence-maps/`
- `src/app/app/trust/reviews/`
- `src/components/app/ai-governance-dashboard-panel.tsx`
- `src/components/app/ai-review-queue-panel.tsx`
- `src/components/app/ai-use-case-detail-panel.tsx`
- `src/components/app/ai-use-case-registry-panel.tsx`
- `src/components/app/ai-vendor-review-detail-panel.tsx`
- `src/components/app/ai-vendor-review-panel.tsx`
- `src/components/app/answer-library-panel.tsx`
- `src/components/app/board-brief-detail-panel.tsx`
- `src/components/app/evidence-map-detail-panel.tsx`
- `src/components/app/pulse-dashboard-panel.tsx`
- `src/components/app/pulse-roadmap-panel.tsx`
- `src/components/app/pulse-snapshot-detail-panel.tsx`
- `src/components/app/quarterly-review-detail-panel.tsx`
- `src/components/app/risk-register-panel.tsx`
- `src/components/app/trust-review-queue-panel.tsx`
- `src/lib/ai-governance/`
- `src/lib/pulse/`
- `src/lib/trust/`
- `src/lib/validation/ai-governance.ts`
- `src/lib/validation/pulse.ts`
- `tests/ai-governance-consequences.integration.test.ts`
- `tests/ai-governance-policy-mapping.integration.test.ts`
- `tests/ai-governance-records.integration.test.ts`
- `tests/ai-governance-review-queue.integration.test.ts`
- `tests/ai-governance-summary.integration.test.ts`
- `tests/pulse-board-brief.integration.test.ts`
- `tests/pulse-quarterly-review.integration.test.ts`
- `tests/pulse-risk-register.integration.test.ts`
- `tests/pulse-roadmap.integration.test.ts`
- `tests/pulse-scoring.integration.test.ts`
- `tests/trustops-drafting.integration.test.ts`
- `tests/trustops-evidence-map.integration.test.ts`
- `tests/trustops-export.integration.test.ts`
- `tests/trustops-findings.integration.test.ts`
- `tests/trustops-package-export.integration.test.ts`
- `tests/trustops-packets.integration.test.ts`
- `tests/trustops-review-queue.integration.test.ts`

## Files expected to change for Response Ops Sprint 1

Additive Response Ops work is expected in these areas:

- `prisma/schema.prisma`
- `prisma/demo-seed.ts`
- `prisma/migrations/20260308*_response_ops_sprint_1/`
- `src/lib/response-ops/`
- `src/lib/validation/response-ops.ts`
- `src/lib/intel/pulse.ts`
- `src/lib/intel/runbooks.ts`
- `src/app/api/response-ops/`
- `src/app/api/intel/runbooks/route.ts`
- `src/app/api/copilot/route.ts`
- `src/app/app/layout.tsx`
- `src/app/app/command-center/page.tsx`
- `src/app/app/tools/page.tsx`
- `src/app/app/findings/page.tsx`
- `src/app/app/pulse/page.tsx`
- `src/app/app/response-ops/`
- `src/components/app/`
- `.agents/skills/vantage-incident-triage/`
- `.agents/skills/vantage-runbook-pack-builder/`
- `.agents/skills/vantage-after-action-generator/`
- `.agents/skills/vantage-tabletop-prep/`
- `.agents/skills/README.md`
- `scripts/local-full-validation.ts`
- `tests/`
- `docs/response-ops-sprint-1-summary.md`
- `docs/response-ops-sprint-1-qa-checklist.md`
- `docs/response-ops-sprint-1-pr.md`
- `docs/marketing-handoff-response-ops-sprint-1.md`

## Risks to avoid

- Do not overwrite or revert any protected TrustOps, Pulse, or AI Governance file content.
- Do not create a separate Response Ops app, shell, or navigation model.
- Do not introduce destructive Prisma changes; use additive models, enums, and nullable links.
- Do not build a fake SOAR layer, live alert ingestion, or endpoint orchestration in Sprint 1.
- Do not duplicate task, finding, or risk logic when existing models already support owned lifecycle.
- Do not blur internal incident notes with externally shareable after-action content.
- Do not break existing runbook task seeding for current `/app/runbooks` workflows while adding incident-linked packs.
- Do not run `build` and `test:full` in parallel on Windows because Prisma file locking is a known constraint.

## Items intentionally left untouched

These areas are out of scope for Response Ops Sprint 1 unless a minimal compatibility fix is required:

- TrustOps questionnaire import, evidence maps, answer library, trust packets, and review queue core behavior
- Pulse scorecard math, risk register behavior, roadmap behavior, board-brief behavior, and quarterly-review behavior beyond incident signal integration
- AI Governance approval logic beyond narrow incident linkage to AI use cases and AI vendors
- full SOAR automation, SIEM ingestion, always-on monitoring, endpoint orchestration, or realtime alerting
- deep cyber-range infrastructure or simulation fidelity work
- billing and entitlement architecture beyond reuse of current patterns
- app shell rewrite or major information architecture changes
- marketing site implementation in the separate `vantageciso` repository
