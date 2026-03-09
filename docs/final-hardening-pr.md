# Final Hardening PR Draft

## Suggested PR title

Launch-candidate hardening for VantageAI suite coherence, demo readiness, and exports

## PR summary

This PR hardens the current local suite without introducing a new module. It focuses on:

- suite-wide naming and navigation consistency
- module-aware commercialization scaffolding
- clearer cross-module linking in Findings and Command Center carry-over
- consistent export filenames and share-safe output handling
- a coherent demo tenant story across TrustOps, Pulse, AI Governance, and Response Ops
- targeted regression updates for export naming

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

Key manual checks:

- Command Center and Tools Hub module framing
- trust packet export naming
- board brief export naming
- after-action export naming
- demo reset story across all confirmed modules
- Findings drill-through for TrustOps, AI Governance, and Response Ops

## Rollout notes

- no destructive schema changes were added in this pass
- demo reset now seeds all confirmed modules, so internal demos should start with `npm.cmd run demo:reset`
- commercialization cues are in-product only and do not change live billing behavior

## Follow-up items

1. capture final launch screenshots using `docs/demo-walkthrough-suite.md`
2. review CI after push with the new demo-reset path
3. decide whether to market the launch as full-suite or TrustOps-led with attach modules
4. consider bundled export packaging in a later hardening pass if customer demand requires it

## Known caveats

- PDF or bundled export packaging remains intentionally limited
- billing/checkout is still not expanded beyond current entitlement scaffolding
- Prisma validation on Windows must remain serial
