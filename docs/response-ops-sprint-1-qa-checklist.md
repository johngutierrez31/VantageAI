# Response Ops Sprint 1 QA Checklist

## Manual test steps

1. Apply migrations and reset the demo tenant.
2. Start the app locally.
3. Open `/app/response-ops`.
4. Use `Start Incident Triage` with a known scenario like `THIRD_PARTY_BREACH` or `RANSOMWARE`.
5. Confirm the created incident appears in `Open Incident Work`.
6. Open the incident detail page.
7. Verify the incident record shows severity, status, ownership, next update, trust or AI links when present, and generated runbook pack tasks.
8. Add a manual timeline event and confirm it appears immediately in the timeline.
9. Launch an additional runbook pack and confirm new incident-linked tasks appear with response phases.
10. Generate the after-action report from the incident detail page.
11. Attempt to export the after-action report before approval.
12. Confirm export is blocked until approval.
13. add reviewer notes, mark the report `NEEDS_REVIEW`, then approve it.
14. Export the approved after-action report in `html`, `markdown`, and `json`.
15. Return to `/app/response-ops` and use `Prepare Tabletop Exercise`.
16. Open the created tabletop record.
17. Complete the tabletop with decisions, gaps, and follow-up actions.
18. Confirm tabletop completion creates or syncs follow-up tasks, findings, and risks.
19. Open `/app/findings` and confirm Response Ops findings appear with Response Ops source labels.
20. Open `/app/pulse` and `/app/command-center` and confirm Response Ops carry-over metrics appear.
21. Open `/app/tools` and `/app/copilot` and confirm Response Ops workflows are surfaced as guided actions.
22. Run the full serial validation commands.

## Expected results

- incident records persist and are searchable/filterable on the Response Ops dashboard
- guided startup creates timeline scaffolding and at least one runbook pack when enabled
- incident-linked tasks persist with response phases and due dates
- incident detail shows durable timeline, findings, risks, and after-action state
- after-action export is blocked before approval and succeeds after approval
- tabletop completion persists gaps, creates follow-up tasks, and syncs findings and risks
- Pulse and Command Center show Response Ops metrics
- Copilot and Tools Hub visibly expose Response Ops guided workflows
- tenant scoping remains intact for all Response Ops records
- audit logging occurs for incident creation, updates, timeline events, runbook launches, after-action updates/exports, and tabletop completion

## Known issues

- No product-blocking functional issues were found in the final local validation run.
- `prisma migrate dev` is non-interactive in this shell, so checked-in migrations should be generated outside the deploy step and then applied with `prisma migrate deploy`.
- The Response Ops module currently uses `html`, `markdown`, and `json` exports for after-action reports; no PDF or bundled closeout package is included in Sprint 1.

## Windows / Prisma note

- Run `build` and `test:full` serially, not in parallel, to avoid Prisma DLL locking on Windows.
