# Trial Experience PR Draft

## Suggested PR title

Separate demo and real 14-day trial workspaces with trial-aware onboarding

## PR summary

This PR rebuilds the top-level trial experience so new trial users land in a real blank tenant instead of the seeded demo workspace.

It introduces:

- durable tenant-scoped `DEMO`, `TRIAL`, and `PAID` workspace modes
- a real trial provisioning path with 14-day lifecycle fields
- full-access trial entitlements through the existing billing and entitlement model
- trial-aware billing, app shell, Command Center, and Tools Hub behavior
- concise first-run onboarding and stronger blank trial empty states
- preserved demo seeding and demo storytelling as a separate code path
- focused unit coverage for trial provisioning and trial entitlement behavior

## Testing notes

Run serially on Windows:

```powershell
npx.cmd prisma migrate deploy
npm.cmd run demo:reset
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:full
```

All commands above passed locally after two in-scope fixes:

1. Pulse board-brief and quarterly-review detail pages now use safe `notFound()` handling instead of letting a Prisma throw poison the browser run.
2. Demo-only Command Center labels expected by the full validation harness were restored without changing trial behavior.

## Rollout notes

- no destructive Prisma changes were used
- demo reset still seeds the demo tenant
- trial tenants start blank by default
- active trial tenants are treated as full-access during the trial window

## Deferred

- opt-in sample-data import for trials
- Stripe checkout or conversion flow
- broad app-shell redesign
