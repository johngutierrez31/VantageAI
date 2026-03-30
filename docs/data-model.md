# Data Model

This model is tenant-scoped and audit-aware across TrustOps, Pulse, AI Governance, and Response Ops workflows.

## Identity and Access

- `Tenant` stores tenant metadata and infrastructure provider defaults.
- `User` + Auth.js tables (`Account`, `Session`, `VerificationToken`) support magic-link auth.
- `Membership` controls tenant role and status (`ACTIVE`, `INVITED`, `SUSPENDED`).

## Core Product

- Templates: `Template`, `TemplateVersion`, `Control`, `Question`.
- Assessments: `Assessment`, `Response`, `Exception`.
- Trust workflow records: questionnaire imports, trust inbox artifacts, review tasks, and trust packet/report links.
- Audit: `AuditLog`.

## Evidence and AI

- `Evidence` stores ingested source metadata and extraction status.
- `EvidenceChunk` stores chunk text + embedding vectors.
- `EvidenceLink` links evidence to questions/responses.
- `AISuggestion` stores generated draft outputs with citation references and confidence.

## Questionnaire Import

- `QuestionnaireImport` tracks import batches and status.
- `QuestionnaireImportRow` stores mapped source rows and applied response linkage.

## Reporting and Export

- `Report` stores generated summaries and structured JSON payload.
- `ReportExport` stores export actions/artifact metadata.
- `TenantBranding` stores branding tokens used in exports.

## Billing

- `StripeCustomer` maps tenant to Stripe customer.
- `Subscription` stores synchronized plan + lifecycle state.
- `BillingWebhookEvent` provides idempotent Stripe event processing.

## Partitioning Rule

- Every business entity includes `tenantId` and must be queried with explicit tenant filters.
- Operator workflows should include explicit lifecycle and ownership fields (`status`, creator/reviewer identity, timestamps) whenever outputs are user-facing and durable.
