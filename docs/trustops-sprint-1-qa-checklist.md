# TrustOps Sprint 1 QA Checklist

## Environment

1. Install dependencies if needed:
   - `npm.cmd ci`
2. Apply schema and demo data:
   - `npx.cmd prisma migrate deploy`
   - `npm.cmd run demo:reset`
3. Start the app:
   - `npm.cmd run dev`
4. Optional automated end-to-end check:
   - `npm.cmd run test:full`
5. Run verification commands serially on Windows:
   - `npm.cmd run typecheck`
   - `npm.cmd run lint`
   - `npm.cmd run test`
   - `npm.cmd run build`
   - `npm.cmd run test:full`

## Manual Test Steps

### A. Questionnaire intake

1. Open [http://127.0.0.1:3000/app/questionnaires](http://127.0.0.1:3000/app/questionnaires)
2. Upload or paste a CSV questionnaire with at least 3 rows
3. Set a buyer organization name before upload
4. Open the created questionnaire

Expected results:

- a questionnaire record exists in the list
- buyer organization appears on the upload card
- row count is correct
- each row appears in the questionnaire detail view
- row order is preserved
- questionnaire status starts as `Uploaded`

### B. Mapping

1. In questionnaire detail, select a template
2. Click `Auto-map Questions`

Expected results:

- each row shows a mapped question or `Unmapped`
- mapping confidence is visible
- questionnaire status moves to `Mapped`

### C. Drafting

1. Ensure the tenant has at least one approved evidence item indexed
2. Click `Draft Questionnaire Answers`

Expected results:

- each drafted row shows answer text
- confidence is shown
- mapped control and evidence link counts appear
- low-confidence or sensitive rows show `Needs Review`
- supporting rows may remain `Draft`
- follow-up tasks are created when support is weak or missing

### D. Review workflow

1. Enter reviewer notes on a row
2. Click `Approve`
3. On another drafted row, enter rejection notes and click `Reject`

Expected results:

- approved row moves to `Approved`
- rejected row moves to `Rejected`
- reviewer notes persist
- questionnaire status reflects aggregate review state
- approved rows are written to the approved answer library

### E. Approved-only export

1. With at least one approved row, click `Export Approved Response Pack`
2. Open the downloaded CSV

Expected results:

- only approved answers are populated in export
- unapproved rows do not leak draft text
- export includes normalized question, review status, confidence, control ids, and evidence ids

### F. Trust inbox linkage

1. Create a trust inbox item linked to the questionnaire
2. Open [http://127.0.0.1:3000/app/trust/inbox](http://127.0.0.1:3000/app/trust/inbox)
3. Open the linked trust inbox record

Expected results:

- linked questionnaire is visible
- trust inbox status updates to `In Review` while questionnaire review is active
- approved counts are visible on the detail page

### G. Trust packet persistence

1. From Trust Inbox detail or Trust Packet page, click `Assemble Packet`
2. Refresh [http://127.0.0.1:3000/app/trust](http://127.0.0.1:3000/app/trust)

Expected results:

- a trust packet record is created and listed
- packet status reflects internal review vs. ready-to-share
- stale artifacts are flagged when older evidence is included

### H. Skills UX

1. Open [http://127.0.0.1:3000/app/tools](http://127.0.0.1:3000/app/tools)
2. Open global search with `Ctrl+K`
3. Open [http://127.0.0.1:3000/app/copilot](http://127.0.0.1:3000/app/copilot)
4. Ask for questionnaire, buyer diligence, or trust packet help

Expected results:

- TrustOps and Questionnaires appear as first-class launchers
- guided workflow labels are visible:
  - Draft Questionnaire Answers
  - Build Evidence Map
  - Assemble Trust Packet
- Copilot recommends TrustOps and Questionnaires for diligence-oriented prompts

## Known Issues

- `Build Evidence Map` is surfaced as a guided workflow entry point, but not yet a first-class persisted record
- approved response-pack export is CSV-first; richer packaged buyer exports are a later sprint
- trust packets are durable records, not bundled downloadable share packages yet
- use `npm.cmd run typecheck`; plain `npx.cmd tsc --noEmit` is unreliable here because of stale incremental `.next` type state
- do not run `npm.cmd run build` and `npm.cmd run test:full` in parallel on Windows because Prisma client generation can hit a file lock
