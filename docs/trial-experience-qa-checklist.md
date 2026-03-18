# Trial Experience QA Checklist

## Serial validation note

Run validation serially on Windows. Keep Prisma and Next.js work one command at a time to avoid DLL locking noise.

## Exact validation commands

```powershell
npx.cmd prisma migrate deploy
npm.cmd run demo:reset
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:full
```

## Automated validation result

- all commands above passed on `2026-03-18`
- `test:full` initially exposed two regressions in Pulse detail-page failure handling and demo-only Command Center labels
- both regressions were fixed and `npm.cmd run test:full` was rerun successfully

## Manual checks

### Trial provisioning

1. Open `/login`.
2. Use the `Start 14-Day Trial` form with a new email and workspace name.
3. Confirm the success state sends a magic link and does not mention the demo tenant.
4. Open the created workspace after sign-in.

Expected result:

- a new tenant is created
- the user is the active owner or admin of that tenant
- the workspace is blank by default

### Trial top-level experience

1. Open `/app/command-center` inside the trial tenant.
2. Open `/app/tools`.
3. Open `/app/settings/billing`.

Expected result:

- the shell shows trial state and time remaining
- Command Center shows the `Start Here` onboarding card
- Tools Hub avoids demo-story language
- billing shows a full-access trial state instead of crippled free-plan copy

### Trial empty states

1. Open `/app/questionnaires`, `/app/trust`, `/app/pulse`, `/app/ai-governance`, `/app/response-ops`, `/app/policies`, and `/app/findings` inside a fresh trial tenant.

Expected result:

- each blank module explains what it is for
- each blank module tells the user the first action to take
- each blank module explains the output the user will get
- each empty state provides one strong CTA

### Demo preservation

1. Run `npm.cmd run demo:reset`.
2. Open `/app/command-center`, `/app/tools`, `/app/trust`, `/app/pulse`, `/app/ai-governance`, and `/app/response-ops` in the demo workspace.

Expected result:

- seeded records still exist
- demo walkthrough language remains available only in demo mode
- the demo path card and seeded artifacts are still visible

### Mode isolation

1. Compare a demo tenant, a trial tenant, and a normal paid-style tenant.
2. Inspect billing, shell badges, and top-level copy.

Expected result:

- demo, trial, and paid use distinct workspace modes
- seeded demo artifacts do not appear in trial tenants
- trial messaging does not appear in demo or paid workspaces

## Known limitations

- optional sample-data import for trial tenants is intentionally deferred
- checkout and conversion flows remain outside this phase
