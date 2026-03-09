# AI Governance Sprint 1 QA Checklist

## Serial validation note

Run the repo validation commands serially on Windows. Do not run `build` and `test:full` in parallel because Prisma file locking can occur.

## Automated validation commands

Run in this order:

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
- [summary.md](C:\Users\JohnC\Documents\Playground\VantageAI\output\test\summary.md) shows `Failures: None`

## Manual test steps

### 1. AI Governance dashboard

1. Open [AI Governance](C:\Users\JohnC\Documents\Playground\VantageAI\src\app\app\ai-governance\page.tsx)
2. Verify KPI cards for total use cases, vendor intakes, high-risk items, conditional approvals, and Pulse hooks
3. Verify recent decisions and AI-linked risk cards render

Expected result:

- dashboard loads without auth or tenant errors in local demo mode
- counts reflect seeded or validation-created AI records

### 2. Register AI use case

1. Open `/app/ai-governance/use-cases`
2. Create a new use case with customer data, reviewer assignment, and a due date
3. Save the record

Expected result:

- record is created
- status is `DRAFT` or `NEEDS_REVIEW` depending on policy conditions
- risk tier, matched policies, blockers, and conditions are visible on the detail page

### 3. Start AI vendor intake

1. Open `/app/ai-governance/vendors`
2. Create a vendor intake with unknown retention and requested security docs
3. Save the record

Expected result:

- vendor review is created
- policy conditions and risk tier are visible
- review queue shows the new item

### 4. Review gating

1. Open the created AI use case detail page
2. Try to move it directly to `APPROVED` while blockers still exist

Expected result:

- API rejects the action
- the UI should show the validation error or retain the prior state
- blocked approval is captured in validation artifact `api/ai-governance-use-case-approval-blocked.json`

### 5. Conditional approval and rejection

1. Update an AI vendor review to `APPROVED_WITH_CONDITIONS`
2. Reject an AI use case with reviewer notes

Expected result:

- conditional approval creates or maintains follow-up task linkage
- rejected or high-risk AI records create or sync findings and Pulse risks
- detail pages show linked finding/risk/task counts

### 6. Review queue operations

1. Open `/app/ai-governance/reviews`
2. Filter by status, reviewer, risk tier, and overdue state
3. Reassign an item or set a new due date

Expected result:

- queue filters work
- status, due date, and reviewer updates save successfully
- overdue or due-soon pills update based on the due date

### 7. Pulse and Command Center integration

1. Open `/app/command-center`
2. Open `/app/pulse`
3. Verify AI Governance metrics and drilldown links are visible

Expected result:

- Command Center shows AI review backlog and high-risk AI pressure
- Pulse dashboard shows AI carry-over metrics
- AI Governance links route into use cases, vendor intake, review queue, and risk register

### 8. Copilot and Tools Hub surfacing

1. Open `/app/tools`
2. Verify AI Governance workflow launchers are visible
3. Open `/app/copilot` and ask an AI-governance question

Expected result:

- guided actions are visible for registering use cases, starting vendor intake, mapping policies, and reviewing AI governance
- Copilot routes users to the AI Governance workflows instead of generic chat behavior

## Known issues

- AI Governance summary is a dashboard/API surface in Sprint 1. There is no dedicated executive export package yet.
- Policy linkage is practical and typed but not a full policy-rule engine.
