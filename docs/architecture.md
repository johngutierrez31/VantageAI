# VantageCISO Architecture (MVP)

- Next.js App Router frontend + route handlers.
- Prisma/Postgres for transactional data with tenant isolation via `tenantId`.
- Deterministic scoring engine in `src/lib/scoring`.
- AI layer and billing are scaffolded as next milestones.
