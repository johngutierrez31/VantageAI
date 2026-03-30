# Staging Deploy Checklist

## 1. Infrastructure

- Confirm `DATABASE_URL` points to staging Postgres.
- Apply migrations: `npm run prisma:migrate`.
- Seed baseline metadata (production-safe): `npm run prisma:seed`.
- Optional guided demo workspace seed for scripted validation only: `npm run prisma:seed:demo`.
- Configure S3-compatible bucket (or keep `LOCAL` for ephemeral staging only).

## 2. Secrets and Providers

- Set `AUTH_SECRET` and `NEXTAUTH_SECRET`.
- Set `NEXTAUTH_URL` and `APP_BASE_URL` to staging URL.
- Configure Resend (`AUTH_EMAIL_FROM`, `RESEND_API_KEY`) and verify sender domain.
- Configure Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, plan price IDs).
- Configure `OPENAI_API_KEY` if semantic embeddings/chat drafting should be active.

## 3. Stripe Webhook

- Register staging webhook endpoint: `/api/stripe/webhook`.
- Subscribe to:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Verify idempotency by replaying an event and confirming duplicate handling.

## 4. Auth and Tenant Access

- Create a user with active `Membership` in staging DB.
- Verify login magic-link delivery and callback.
- Confirm middleware blocks unauthenticated `/app/*` and protected `/api/*`.
- Confirm users without active membership are denied.

## 5. Product Workflow Smoke Test

- Ingest evidence and confirm chunk indexing succeeds.
- Generate RAG draft and verify citations return evidence references.
- Import a questionnaire, preview mappings, and apply to responses.
- Generate report and export HTML/JSON/Markdown.
- Validate PDF export gate behavior for Starter vs Pro/Partner plans.

## 6. Reliability and Observability

- Run tests: `npm test`.
- Run type-check: `npx tsc --noEmit`.
- Verify audit log entries are written for template, assessment, ingestion, report, and billing actions.
- Confirm billing webhook events are persisted in `BillingWebhookEvent`.

## 7. Release Decision

- Capture known staging issues with severity and owner.
- Require explicit signoff from product + engineering before production promotion.
