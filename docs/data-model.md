# Data Model

Core entities:
- Identity/Access: `Tenant`, `User`, `Membership`
- Templates: `Template`, `TemplateVersion`, `Control`, `Question`
- Assessments: `Assessment`, `Response`, `Exception`
- Evidence/AI: `Evidence`, `EvidenceLink`, `AISuggestion`
- Audit/Billing: `AuditLog`, `StripeCustomer`, `Subscription`

Key rules:
- `tenantId` is present on all business entities to enforce tenant partitioning.
- `Template` has unique `(tenantId, name)` to avoid duplicate names per tenant.
- `Response` has unique `(assessmentId, questionId)` and tenant index for faster scoped queries.
