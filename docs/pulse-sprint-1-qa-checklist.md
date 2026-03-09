# Pulse Sprint 1 QA Checklist

## Manual test steps

### 1. Generate an executive scorecard

1. Open `/app/pulse`.
2. Choose `Quarterly` or `Monthly`.
3. Run `Generate Executive Scorecard`.
4. Open the latest snapshot detail.
5. Approve and publish it.

Expected results:

- A `PulseSnapshot` record is persisted.
- Category scores, measured inputs, overall score, and summary text render.
- Status moves through review/publication state and saves successfully.
- The snapshot shows linked roadmap, board brief, and quarterly review records when they exist.

### 2. Build and manage the risk register

1. Open `/app/pulse/risks`.
2. Run `Sync Auto Risks`.
3. Create one manual risk.
4. Filter by severity, status, and source.
5. Reassign an owner or due date and save.

Expected results:

- Auto-sourced risks appear from findings, assessment gaps, or overdue work.
- Manual risks persist alongside auto-sourced risks.
- Owner, due date, status, and severity changes persist.
- Filters return usable subsets without leaving the page.

### 3. Generate and review the roadmap

1. Open `/app/pulse`.
2. Run `Generate 30/60/90 Roadmap`.
3. Open `/app/pulse/roadmap`.
4. Update roadmap status or reviewer notes.
5. Update at least one roadmap item owner, due date, and status.

Expected results:

- A `PulseRoadmap` record is persisted.
- Items are grouped into 30 / 60 / 90 horizons.
- Roadmap review state saves.
- Roadmap item ownership, due dates, rationale, and expected impact persist.

### 4. Generate and export a board brief

1. Open `/app/pulse`.
2. Run `Draft Board Brief`.
3. Open the board brief detail page.
4. Attempt export before approval.
5. Mark it `Needs Review`, then `Approve Brief`.
6. Export HTML, Markdown, and JSON.

Expected results:

- A `BoardBrief` record is persisted.
- Export is blocked until the brief is approved.
- Reviewer notes persist.
- Approved exports download successfully and exclude internal-only TrustOps notes.

### 5. Prepare and finalize a quarterly review

1. Open `/app/pulse`.
2. Run `Prepare Quarterly Review`.
3. Open the quarterly review detail page.
4. Add attendees, notes, decisions, and follow-up actions.
5. Finalize the review.

Expected results:

- A `QuarterlyReview` record is persisted.
- It links to the current snapshot, roadmap, board brief, and top risks.
- Decisions and follow-up actions persist.
- Finalization succeeds after the board brief is approved.

### 6. Verify Command Center Pulse layer

1. Open `/app/command-center`.
2. Review the Pulse executive card section.
3. Open the linked snapshot, risk register, roadmap, board brief, and quarterly review pages.

Expected results:

- Command Center shows current posture score, score delta, open top risks, overdue roadmap items, and TrustOps carry-over.
- Links resolve into the correct Pulse records.
- Pulse feels like a top-level workflow, not a hidden side path.

### 7. Verify guided workflow surfacing

1. Open `/app/tools`.
2. Confirm the Pulse guided launchers.
3. Open `/app/copilot`.
4. Ask for an executive cyber update, risk register, or 30 / 60 / 90 roadmap.

Expected results:

- Tools Hub shows Pulse launchers with clear outputs.
- Copilot recommends Pulse, risk register, roadmap, board brief, or quarterly review workflows when relevant.
- Suggested workflows map to durable Pulse records.

## Known issues

- Board-brief exports are stable in `html`, `markdown`, and `json`; there is no PDF or packaged board-book export in this sprint.
- Historical trend analytics are intentionally shallow in Sprint 1; the scorecard is current-state plus prior-snapshot delta, not full BI reporting.
- Pulse depends on underlying TrustOps, findings, tasks, and assessment signals; a nearly empty tenant will produce thinner executive outputs.

## Windows / Prisma note

Run validation commands serially on Windows. Do not run `build` and `test:full` in parallel because Prisma engine DLL locking can occur.
