# TrustOps Sprint 1 PR Draft

## Suggested PR Title

`Build TrustOps Sprint 1 questionnaire review and trust packet workflow`

## PR Summary

This PR turns the existing questionnaire and trust surfaces into a real TrustOps Sprint 1 vertical slice inside VantageAI.

Key changes:

- add durable TrustOps schema for questionnaire intake lifecycle, structured draft answers, approved answer library, trust packets, and task linkage
- persist questionnaire buyer organization, row order, normalized question text, review state, reviewer notes, and confidence
- generate tenant-scoped questionnaire drafts using approved answers, mapped controls, and evidence with citations and confidence
- require review for low-confidence, weak-support, or sensitive answers
- export approved answers only for questionnaires and trust inbox items
- create follow-up tasks automatically when evidence is weak or missing
- persist trust packets and surface them in Trust page and Trust Inbox
- expose TrustOps workflows in Tools Hub, app search, and Copilot recommendations
- add repo-local Vantage workflow skills and supporting docs

## Testing Notes

Validated locally with:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run test:full`

Supporting artifacts:

- [docs/trustops-sprint-1-summary.md](C:\Users\JohnC\Documents\Playground\VantageAI\docs\trustops-sprint-1-summary.md)
- [docs/trustops-sprint-1-qa-checklist.md](C:\Users\JohnC\Documents\Playground\VantageAI\docs\trustops-sprint-1-qa-checklist.md)
- [output/test/summary.md](C:\Users\JohnC\Documents\Playground\VantageAI\output\test\summary.md)

## Rollout Notes

- run Prisma migration before deployment
- no billing logic expansion was added in this sprint
- demo reset already clears the new TrustOps models
- the approved-only export behavior is a functional change and should be noted in release review

## Follow-up Items

1. make evidence map a first-class persisted workflow
2. add reviewer assignment and SLA metrics
3. expand trust packet export beyond CSV-first response pack flows
4. add Pulse metrics for trust backlog, stale artifacts, and turnaround time
5. build AI Governance intake and approval workflows as the next paid module
