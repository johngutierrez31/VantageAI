# AI Governance Sprint 1 PR Draft

## Suggested PR title

Launch AI Governance Sprint 1 with registry, vendor intake, approvals, and Pulse hooks

## PR summary

This PR adds AI Governance as a first-class VantageAI module on top of the existing TrustOps and Pulse foundation.

It introduces:

- durable AI use case registry records
- durable AI vendor intake records
- typed data-class and policy mapping
- reviewer assignment, due dates, and AI review queue operations
- findings, tasks, and Pulse risk integration for high-risk and rejected AI workflows
- AI Governance dashboard, use-case pages, vendor-intake pages, and review queue pages
- guided AI Governance workflow launchers in Tools Hub and Copilot
- repo-local AI Governance skills
- AI Governance coverage in the full local validation harness

## Testing notes

Ran serially on March 8, 2026:

```powershell
npx.cmd prisma migrate deploy
npm.cmd run demo:reset
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:full
```

Results:

- `typecheck` passed
- `lint` passed
- `test` passed with `29` files and `44` tests
- `build` passed
- `test:full` passed

Validation artifact:

- [summary.md](C:\Users\JohnC\Documents\Playground\VantageAI\output\test\summary.md)

## Rollout notes

- apply the Prisma migration before running the app against shared environments
- keep rollout behind normal tenant auth and existing entitlement patterns
- configure any environment that uses seeded demo data to rerun `demo:reset` after the migration
- validate that `OPENAI_API_KEY` remains configured in deployment environments so Copilot stays live

## Follow-up items

- add richer AI Governance summary export for leadership review
- add dedicated AI evidence/document workflows
- add reminder and escalation automation for overdue AI reviews
- feed AI Governance summaries into later board-brief and quarterly-review refinement
