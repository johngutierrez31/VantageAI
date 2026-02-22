# Infrastructure Decisions (Final)

Date: February 20, 2026

## Decisions

- Database: PostgreSQL with Prisma ORM; multi-tenant isolation enforced with `tenantId` scoped queries and membership checks.
- Blob Storage: S3-compatible object storage in production (`S3`), local fallback in development (`LOCAL`).
- Vector Layer: Hashed embedding fallback in-app (`HASHED`) with optional OpenAI embeddings (`OPENAI`) for higher retrieval quality.
- Email: Resend (`RESEND`) for Auth.js magic-link delivery.

## Why this stack

- PostgreSQL + Prisma keeps transactional entities, audit logs, and billing state in one strongly-consistent store.
- S3-compatible APIs are widely deployable (AWS S3, Cloudflare R2, MinIO) and avoid provider lock-in.
- Dual vector strategy keeps local development deterministic while allowing better semantic retrieval in production.
- Resend has simple API integration and reliable deliverability for auth emails.

## Operational policy

- Tenant-level defaults are persisted on `Tenant` (`activeStorageProvider`, `activeVectorProvider`, `activeEmailProvider`).
- PII and customer evidence remain tenant-partitioned at rest and in query paths.
- All gated features must check plan entitlements before executing.
- Billing events are idempotent via stored Stripe event IDs.
