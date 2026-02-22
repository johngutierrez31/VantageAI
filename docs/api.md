# API Surface

## Auth

- `GET/POST /api/auth/[...nextauth]` Auth.js handlers.

## Templates

- `GET /api/templates`
- `POST /api/templates`
- `GET /api/templates/:templateId`
- `PATCH /api/templates/:templateId` (create new draft template version)
- `DELETE /api/templates/:templateId`
- `POST /api/templates/:templateId/publish`

## Assessments

- `GET /api/assessments`
- `POST /api/assessments`
- `GET /api/assessments/:assessmentId`
- `POST /api/assessments/:assessmentId` (response upsert)
- `GET /api/assessments/:assessmentId/score`

## Evidence + RAG

- `GET /api/evidence`
- `POST /api/evidence` (ingestion + chunk embedding)
- `POST /api/assessments/:assessmentId/evidence/link`
- `POST /api/assessments/:assessmentId/rag` (AI draft answer + citations)

## Questionnaire Import

- `POST /api/assessments/:assessmentId/questionnaire/import` (parse + auto-map)
- `POST /api/assessments/:assessmentId/questionnaire/commit` (apply mapped rows to responses)

## Reports + Export

- `GET /api/assessments/:assessmentId/report` (latest)
- `POST /api/assessments/:assessmentId/report` (generate)
- `GET /api/reports/:reportId/export?format=html|markdown|json|pdf`

## Billing

- `GET /api/billing/subscription`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/stripe/webhook`

## Security and Tenancy

- Middleware enforces authentication and active tenant membership on `/app/*` and protected `/api/*`.
- Write operations are role-gated via RBAC.
- Gated features enforce plan entitlements before execution.
- Writes are audited to `AuditLog`.
