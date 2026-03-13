# Demo QA Checklist

Date: 2026-03-12

## Serial validation commands

Run in this order on Windows:

```powershell
npx.cmd prisma migrate deploy
npm.cmd run demo:reset
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:full
```

Expected result:

- all commands succeed
- the seeded workspace is repopulated after reset
- the new demo-path cards render on Command Center and Tools Hub

## Manual demo-path checks

### 1. Command Center entry

1. Open `/app/command-center`.
2. Confirm the `Start Here: Demo Path` card is visible above the module detail cards.
3. Confirm the 3-minute path includes Command Center, the seeded trust request, the seeded board brief, the seeded AI use case, and the active incident.

Expected result:

- a new viewer can tell where to click first without reading docs
- the seeded artifact buttons route to real records, not empty module shells

### 2. Tools Hub entry

1. Open `/app/tools`.
2. Confirm the same demo-path surface appears near the top of the page.
3. Confirm the 10-minute path buttons point into TrustOps, Pulse, AI Governance, and Response Ops seeded records.

Expected result:

- Tools Hub works as a live demo menu
- the seeded artifacts feel intentionally curated rather than randomly populated

### 3. TrustOps artifact story

1. Open `/app/trust/inbox/trust_inbox_demo_northbridge`.
2. Verify the trust request shows linked questionnaire status, evidence-map linkage, and trust packet history.
3. Open `/app/questionnaires/questionnaire_demo_northbridge`.
4. Confirm three approved drafts and one `NEEDS_REVIEW` draft remain visible.
5. Open `/app/trust/evidence-maps/evidence_map_demo_northbridge`.

Expected result:

- TrustOps shows intake, review, evidence mapping, and export readiness in one coherent story
- the buyer-safe gap is still visible and owned, not hidden by the seed

### 4. Pulse artifact story

1. Open `/app/pulse/board-briefs/board_brief_demo_2026_q1`.
2. Confirm the title reads `Q1 board brief - cyber posture and buyer readiness`.
3. Open `/app/pulse/quarterly-reviews/quarterly_review_demo_2026_q1`.

Expected result:

- seeded executive artifacts have polished names
- the board brief and quarterly review reflect TrustOps, AI Governance, and Response Ops carry-over

### 5. AI Governance artifact story

1. Open `/app/ai-governance/use-cases/ai_use_case_demo_questionnaire_copilot`.
2. Confirm the record title reads `TrustOps questionnaire response copilot`.
3. Open `/app/ai-governance/vendors/ai_vendor_review_demo_answerflow`.

Expected result:

- AI Governance clearly shows conditional approval, vendor follow-up, and Pulse linkage
- the module does not feel empty or speculative

### 6. Response Ops artifact story

1. Open `/app/response-ops/incidents/incident_demo_answerflow_notice`.
2. Confirm the title reads `AnswerFlow retention assurance vendor notice`.
3. Verify runbook pack, timeline, and linked carry-over are present.
4. Open `/app/response-ops/incidents/incident_demo_privileged_mailbox`.
5. Confirm the approved after-action report title reads `Privileged mailbox phishing after-action`.
6. Open `/app/response-ops/tabletops/tabletop_demo_ransomware_q2`.

Expected result:

- the active incident feels live
- the resolved incident and tabletop prove recurring operational value beyond one incident

## Export and branding checks

1. From TrustOps, export the seeded trust packet.
2. From Pulse, export the seeded board brief.
3. From Response Ops, export the approved after-action report.

Expected result:

- seeded exports remain usable and review-gated where required
- export-facing artifact names are polished and consistent
- tenant branding uses `Astera Cloud Security` in export-facing contexts

## Regression note

No schema changes were introduced in this polish pass. The risk profile is concentrated in demo seed wording, new read-only demo-path helpers, and additive UI surfaces on Command Center and Tools Hub.
