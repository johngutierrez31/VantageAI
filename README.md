# VantageAI Product App

`app.vantageciso.com` is a multi-tenant security operating system for lean teams under procurement pressure.

The product roadmap and build rules are defined in `AGENTS.md`. This `README` summarizes the current implementation posture for contributors.

## Product Priorities

Build modules in this order:

1. TrustOps
2. Pulse
3. AI Governance
4. Response Ops

Favor work that improves buyer diligence turnaround, procurement readiness, executive visibility, and recurring weekly operations.

## Existing Product Surfaces

Extend these first before adding net-new surfaces:

- Command Center
- Trust Inbox
- Findings / Gaps
- Policies
- Copilot
- Runbooks
- Security Analyst
- Cyber Range
- Questionnaires
- Assessments

## Platform Expectations

- Tenant-scoped records for every meaningful operator output.
- Audit-aware workflows with actor and status tracking.
- Explicit Prisma models when lifecycle/review/export/reporting is required.
- Zod-validated payloads and typed route contracts.
- AI workflows must store confidence, cite evidence where available, and require review for low-confidence/high-stakes output.

## Documentation Map

- Setup: `docs/setup.md`
- API surface: `docs/api.md`
- Architecture: `docs/architecture.md`
- Data model: `docs/data-model.md`
- AI guardrails: `docs/ai-guardrails.md`
- Operator help center: `docs/help-center/README.md`
- Deployment checks: `docs/staging-deploy-checklist.md`

## Quality Gates

- `npm run test` - unit and integration workflow coverage (scoring, RAG, questionnaire import, report export, policy generation, cyber-range generation, security validation).
- `npm run lint` - static lint checks.
- `npm run typecheck` - TypeScript compile-time checks.
- `npm run build` - production build validation.
- `npm run test:runtime` - runtime smoke checks against a production server (`/`, `/login`, `/skills`, auth-gated `/app`, and protected API behavior).
- `npm run test:deep` - full deep validation pass (`test` + `build` + runtime smoke).
- `npm run demo:reset` - deterministic reset and reseed of the demo tenant workspace.
- `npm run test:local-full` - local browser/API validation against an already-running dev server.
- `npm run test:full` - deterministic full validation wrapper (`demo:reset` + start local server + run `test:local-full` + stop server + `demo:reset` cleanup).

## CI Validation

- GitHub Actions runs lint, unit/integration tests, production build, and `npm run test:full` on push and pull request.
- CI serves the built app during the full-flow validation path, so the push gate covers production build output rather than only `next dev`.
- Full-flow artifacts are uploaded from `output/test`.
- Add `OPENAI_API_KEY` as a GitHub Actions secret if you want CI to exercise the live OpenAI path; otherwise Copilot is validated in fallback mode.
