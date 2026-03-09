# Response Ops Sprint 1 PR Draft

## Suggested PR title

Launch Response Ops Sprint 1 with incident triage, runbook packs, and after-action workflows

## PR summary

This PR introduces Response Ops as a first-class premium module inside VantageAI.

It adds:

- persisted incident records with guided first-hour startup
- incident-linked runbook task packs and durable timeline events
- review-gated after-action reports with export
- lightweight tabletop exercises with follow-up conversion
- findings, risks, tasks, Pulse, and Command Center integration
- guided Response Ops workflows in Tools Hub and Copilot
- repo-local Response Ops skills
- Response Ops coverage in the full local validation harness

## Testing notes

Run serially:

```powershell
npx.cmd prisma migrate deploy
npm.cmd run demo:reset
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:full
```

Validated locally:

- `typecheck`
- `lint`
- `test`
- `build`
- `test:full`

Latest full validation artifact:

- `output/test/summary.md`

## Rollout notes

- apply the checked-in Response Ops migration before app rollout
- reset or reseed demo environments after migration so Response Ops surfaces have clean baseline data
- enable module demos from `/app/response-ops`, `/app/command-center`, `/app/pulse`, and `/app/tools`
- keep rollout focused on operator workflows, not external-share incident packaging

## Follow-up items

- add richer incident queue/reporting views and escalation reminders
- add more scenario packs and tabletop templates
- add premium closeout packaging and optional PDF output
- add commercialization polish around entitlements, onboarding, and managed-review hooks
