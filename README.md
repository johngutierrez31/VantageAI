# VantageCISO

Multi-tenant security assessment platform with:

- Solo-CISO command center with threat trend radar and seven-day mission queue.
- One-click mission and runbook task pack automation.
- Auth.js magic-link auth and tenant membership enforcement.
- Template + assessment lifecycle with deterministic scoring.
- Evidence vault ingestion, chunk embeddings, and RAG draft citations.
- Questionnaire import/mapping workflow into assessment responses.
- Report generation and branded exports.
- Stripe subscriptions, webhook sync, and feature entitlements.

See `docs/setup.md`, `docs/api.md`, `docs/solo-ciso-operating-system.md`, and `docs/staging-deploy-checklist.md`.

## Quality Gates

- `npm run test` - unit and integration workflow coverage (scoring, RAG, questionnaire import, report export, policy generation, cyber-range generation, security validation).
- `npm run lint` - static lint checks.
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
