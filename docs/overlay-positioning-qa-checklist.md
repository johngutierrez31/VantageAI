# Overlay Positioning QA Checklist

## Product clarity

- [ ] `Command Center` explains the operating-layer story and links to `Adoption Mode`.
- [ ] `Tools Hub` includes `Adoption Mode` and the “work with your existing stack” framing.
- [ ] Module headings clearly explain what TrustOps, Pulse, AI Governance, and Response Ops are for.
- [ ] Search can find `Adoption Mode`.
- [ ] Copilot can recommend `Adoption Mode` for onboarding, migration, import, or stack-fit prompts.

## Adoption mode

- [ ] `/app/adoption` loads with populated demo content after `demo:reset`.
- [ ] Start-here paths are visible for questionnaire response, board brief, AI review, incident handling, and stack-fit guidance.
- [ ] Connector-aware guidance is visible without exposing secret material.
- [ ] The value carry-over section shows a coherent path across modules.

## Imports

- [ ] Manual paste import works for findings.
- [ ] CSV paste import works for risks or approved answers.
- [ ] Connector-assisted export import requires a valid configured connector.
- [ ] Imported records create a durable `AdoptionImport` record.
- [ ] Audit history records `adoption_import_completed`.
- [ ] Imported findings appear in Findings Workbench.
- [ ] Imported risks appear in Pulse risk workflows.
- [ ] Imported approved answers appear in the answer library path when relevant.
- [ ] Imported incidents appear in Response Ops.

## Demo tenant

- [ ] Demo reset seeds recent adoption imports.
- [ ] Adoption Mode does not land in an empty state in the demo tenant.
- [ ] The seeded import history supports the “Vantage works with your stack” narrative.

## Validation

- [ ] `npx.cmd prisma migrate deploy`
- [ ] `npm.cmd run demo:reset`
- [ ] `npm.cmd run typecheck`
- [ ] `npm.cmd run lint`
- [ ] `npm.cmd run test`
- [ ] `npm.cmd run build`
- [ ] `npm.cmd run test:full`
