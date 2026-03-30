# VantageAI Architecture

## Product Shape

VantageAI is a tenant-scoped security operating system, not a standalone assessment utility. The core module order and commercial priority are:

1. TrustOps
2. Pulse
3. AI Governance
4. Response Ops

These modules are connected through shared records and operator workflows across Command Center, Trust Inbox, Findings, Policies, Copilot, Runbooks, Security Analyst, Cyber Range, Questionnaires, and Assessments.

## Core Runtime

- Runtime: Next.js App Router (server components + route handlers).
- Data: PostgreSQL via Prisma with strict `tenantId` scoping.
- Auth: Auth.js magic-link email sign-in with Prisma adapter tables.
- Access Control: middleware + RBAC + active membership enforcement.

## Shared Product Data Principles

- Durable records for meaningful workflow output.
- Tenant isolation on all business entities.
- Explicit relational models (over opaque JSON) when lifecycle, review, reporting, or export is needed.
- Operator-visible status, timestamps, creator, and reviewer fields for lifecycle-aware workflows.

## Workflow Systems

- TrustOps workflows: questionnaire ingestion, mapping, response drafting, trust packet generation, review queue handling.
- Pulse workflows: findings and risk visibility, ownership tracking, leadership posture inputs.
- AI Governance workflows: use case and vendor review records with policy-aware approval gates.
- Response Ops workflows: incident lifecycle, runbook execution, and after-action durability.

## Evidence and AI Workflow

- Evidence vault stores ingested content and chunk embeddings.
- Retrieval ranks chunks by cosine similarity for draft support.
- AI output is advisory and must persist confidence.
- AI output cites available evidence; unsupported claims are marked as weak/missing support.
- Low-confidence or high-stakes output requires human review before downstream use.

## Reporting and Billing

- Deterministic scoring and gap extraction feed reports and exports.
- Persisted report artifacts support branded export rendering.
- Stripe checkout + portal + webhook sync drive subscriptions and entitlements.

## Auditability

- Operator and system writes emit audit records with actor, entity, action, and metadata.
- Cross-module workflows should link artifacts back to source objects (questionnaires, trust inbox items, evidence, controls, tasks, reports, audit logs).
