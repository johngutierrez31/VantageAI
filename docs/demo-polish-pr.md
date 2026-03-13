# Demo Polish PR Draft

## Suggested PR title

`Polish the seeded VantageAI demo tenant with an in-app wow path and guided demo assets`

## PR summary

This PR improves demo readiness for the current VantageAI suite without adding a new module or destabilizing existing workflows.

Included:

- an in-app `Start Here: Demo Path` surface on Command Center and Tools Hub
- a shared tenant-aware demo-path helper that routes to real seeded records
- seeded demo-story naming and branding polish for key trust, Pulse, AI Governance, and Response Ops artifacts
- repo-local demo skills for tenant curation, walkthrough planning, and export auditing
- demo walkthrough, QA, summary, and preflight docs for the current seeded suite story
- unit coverage for demo-path generation and fallback behavior

## Testing notes

Ran serially on Windows:

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

- all commands passed
- `demo:reset` repopulated the seeded workspace cleanly
- the full validation harness completed successfully against the new demo-path surfaces

## Rollout notes

- start local or shared demos with `npm.cmd run demo:reset`
- use Command Center or Tools Hub as the first screen; both now expose the seeded wow path directly
- no schema or migration changes were introduced in this pass

## Caveats

- the core tenant name remains `Demo Tenant`; export-facing branding is improved, but this pass avoided broader identity churn
- demo exports are still current lightweight export flows, not bundled packages
- the demo-path helper intentionally falls back to stable module routes when seeded records are missing
