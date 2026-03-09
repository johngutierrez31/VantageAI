# Final Hardening QA Checklist

## Serial validation note

Run validation serially on Windows. Do not run `build` and `test:full` in parallel because Prisma DLL locking can cause false failures.

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

## Manual suite checks

### Navigation and suite framing

1. Open `/app/command-center`.
2. Confirm module entry points are visible for TrustOps, Pulse, AI Governance, Response Ops, and Billing.
3. Open `/app/tools`.
4. Confirm guided workflows are grouped by module and premium module cues are visible.
5. Open `/app/copilot`.
6. Confirm the heading and placeholder describe Copilot as a workflow launcher rather than generic chat.

Expected result:

- naming is consistent across the suite
- there is no visible `Volume I` / `Volume II` drift
- Policies, Runbooks, and Command Center labels are consistent

### Demo tenant story

1. Run `npm.cmd run demo:reset`.
2. Open `/app/trust`, `/app/pulse`, `/app/ai-governance`, and `/app/response-ops`.
3. Confirm each page has seeded records and that the story is coherent:
   - TrustOps buyer diligence in progress
   - Pulse scorecard and roadmap live
   - AI Governance conditional approval and pending vendor review
   - Response Ops active incident plus approved after-action report

Expected result:

- the suite is not empty after reset
- the seeded story carries across modules
- the demo tenant is suitable for walkthroughs without additional setup

### TrustOps share/export path

1. Open `/app/trust`.
2. Confirm the seeded trust packet is present.
3. Export the packet in HTML.
4. Open `/app/questionnaires/[seeded-id]` and confirm a low-confidence item still requires review.

Expected result:

- approved answers are reusable and visible
- export uses the new suite-prefixed filename
- the buyer-safe gap remains visible as open work

### Pulse carry-over

1. Open `/app/pulse`.
2. Confirm the posture score, top risks, roadmap, board brief, and quarterly review are present.
3. Open `/app/command-center`.
4. Verify trust, AI, and incident carry-over metrics are visible.

Expected result:

- Pulse reflects cross-module signals
- TrustOps findings count is trust-specific, not all findings
- Command Center drill-through links open the expected module surfaces

### AI Governance linking

1. Open `/app/ai-governance`.
2. Open the seeded AI use case and vendor intake detail pages.
3. Open `/app/findings`.

Expected result:

- the AI use case shows conditional approval context
- the vendor intake shows pending review context
- findings display links back to AI Governance records

### Response Ops linking

1. Open `/app/response-ops`.
2. Open the active incident detail page.
3. Confirm timeline, runbook tasks, and incident carry-over are visible.
4. Open the resolved incident’s after-action report path and export HTML.

Expected result:

- incident-linked work is durable and visible
- after-action export remains review-gated and share-safe
- export filename uses the suite naming convention

## Demo walkthrough checklist

1. Start in Command Center
2. Show TrustOps open work and packet
3. Move to Pulse scorecard and board brief
4. Show AI Governance conditional approval and pending vendor intake
5. Show active Response Ops incident and after-action artifact
6. Return to Command Center to show the suite as one operating model

## Known issues

- export packaging remains lightweight and does not yet produce bundled board-book or trust-center packages
- commercial packaging is scaffolded in-product, but billing UX is still intentionally minimal
- Windows Prisma runs still require serial execution
