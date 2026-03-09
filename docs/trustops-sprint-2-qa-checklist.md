# TrustOps Sprint 2 QA Checklist

## Manual test steps

### 1. Questionnaire intake and assignment

1. Open `/app/questionnaires`.
2. Upload a CSV questionnaire with at least one supported question and one unsupported sensitive commitment question.
3. Open the uploaded questionnaire.
4. Assign a reviewer and due date.

Expected results:

- The upload persists.
- Row order is preserved.
- Reviewer and due date save successfully.
- The questionnaire appears in `/app/trust/reviews`.

### 2. Drafting and review

1. From the questionnaire detail page, run `Auto-map Questions`.
2. Run `Draft Questionnaire Answers`.
3. Approve supported drafts.
4. Reject the unsupported sensitive draft with reviewer notes.

Expected results:

- Drafts persist with confidence, citations, review state, and evidence/control links.
- Supported rows can be approved and promoted into the Answer Library.
- Rejected rows require reviewer notes.
- Rejected or weak-support rows create TrustOps findings.

### 3. Evidence Map workflow

1. From the questionnaire detail page, run `Build Evidence Map`.
2. Open the Evidence Map.
3. Assign a reviewer and due date.
4. Approve the Evidence Map.
5. Use `Refresh from Questionnaire`.

Expected results:

- An `EvidenceMap` record is persisted.
- Evidence Map items link question clusters, support strength, controls, evidence ids, related tasks, and related findings.
- Approval metadata is saved.
- Refreshing a previously approved map moves it back to review instead of silently keeping approval.

### 4. Answer Library management

1. Open `/app/trust/answer-library`.
2. Search for an approved answer promoted from the questionnaire.
3. Change scope, owner, or status and save.

Expected results:

- Reusable answers appear with source questionnaire, usage count, last-used, and approval metadata.
- Scope/status updates persist.
- Archived entries remain visible when filtered, not deleted.

### 5. Review Queue operations

1. Open `/app/trust/reviews`.
2. Filter by work-item type and timing state.
3. Update reviewer assignment or due date on a questionnaire, Evidence Map, or trust packet.

Expected results:

- Queue metrics reflect total, overdue, due soon, and unassigned counts.
- Assignment changes persist.
- Overdue and due-soon states display clearly.

### 6. Trust packet packaging

1. Open `/app/trust`.
2. Assemble an internal-review trust packet.
3. Export HTML, Markdown, and JSON.
4. Assemble an external-share packet.
5. Mark it `READY_TO_SHARE`.
6. Export the external packet.

Expected results:

- Trust packets persist with Evidence Map linkage, approved contact details, export count, and manifest data.
- Internal-review exports work immediately.
- External-share packets require review state before export.
- External exports exclude internal-only fields such as Evidence Map next-action guidance.

### 7. Trust Inbox and Findings

1. Open the linked Trust Inbox item.
2. Confirm questionnaire status, packet history, packet exports, and Evidence Map link.
3. Open `/app/findings`.
4. Update a TrustOps finding owner, priority, or status.

Expected results:

- Trust Inbox shows packet history and Evidence Map linkage.
- Findings workbench shows TrustOps findings alongside tasks and exceptions.
- Finding updates persist and remain tenant-scoped.

### 8. Command Center and workflow surfacing

1. Open `/app/command-center`.
2. Verify TrustOps operational pulse cards.
3. Open `/app/tools`.
4. Open `/app/copilot` and ask a procurement or trust-response question.

Expected results:

- Command Center shows questionnaires awaiting review, overdue reviews, open TrustOps findings, answer reuse count, and trust packet counts.
- Tools Hub shows guided TrustOps launchers.
- Copilot recommends TrustOps, Questionnaires, Review Queue, Answer Library, or Evidence Map workflows when relevant.

## Known issues

- `/app/templates` and `/app/templates/[id]` still redirect to Tools Hub rather than a dedicated template detail UI.
- Trust packet packaging uses structured exports (`html`, `markdown`, `json`) instead of a zip bundle in this sprint.
- TrustOps findings are now durable, but broader cross-module Pulse analytics remain deferred.

## Windows / Prisma note

Run validation commands serially on Windows. Do not run `build` and `test:full` in parallel because Prisma engine DLL locking can occur.
