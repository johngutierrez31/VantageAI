# Pulse Sprint 1 PR

## Suggested PR title

`Launch Pulse Sprint 1 with scorecards, risk register, roadmap, and board briefs`

## PR summary

This PR introduces Pulse as an executive-facing recurring module built on live TrustOps, findings, tasks, and assessment signals.

Included in this slice:

- persisted Pulse snapshots with explainable posture scoring
- tenant-scoped risk register with auto-sourced and manual risks
- persisted 30 / 60 / 90 roadmap generation and management
- persisted board brief workflow with review-gated exports
- persisted quarterly review workflow
- Command Center Pulse metrics and links
- guided Pulse workflow launchers across Pulse, Tools Hub, and Copilot
- repo-local Pulse skills for scorecards, board briefs, risks, roadmap planning, and quarterly review prep
- full local validation coverage for the Pulse lifecycle

## Testing notes

Run serially:

- `npx.cmd prisma migrate deploy`
- `npm.cmd run demo:reset`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run test:full`

Key validated flows:

- Pulse snapshot generation, approval, and publication
- risk-register sync, manual intake, retrieval, filtering, and update
- roadmap generation and item updates
- board-brief generation, approval gating, and export behavior
- quarterly-review preparation, update, and finalization
- Command Center, Pulse dashboard, risk register, roadmap, board brief, and quarterly review UI route coverage

Artifacts:

- `output/test/summary.md`
- `output/test/summary.json`

## Rollout notes

- Apply the Pulse Sprint 1 Prisma migration before deployment.
- Keep validation commands serial on Windows hosts.
- Pulse uses existing server-side environment configuration; no new public env vars are required.
- Live Copilot workflow recommendations continue to depend on `OPENAI_API_KEY`.
- This PR must ride with the already-local TrustOps Sprint 1 and Sprint 2 changes because Pulse builds directly on those records and flows.

## Follow-up items

- add historical trend views and richer period-over-period posture reporting
- add stronger risk dedupe and change tracking
- expand executive exports and board-package polish
- begin AI Governance Sprint 1 using the new recurring executive workflow surfaces
- begin Response Ops Sprint 1 after Pulse is stable
