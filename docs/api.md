# API (Implemented in this increment)

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

## Notes
- Request payloads are validated with Zod.
- All writes include audit log records.
- Tenant scoping is enforced with `tenantId` filters and parent ownership checks.
