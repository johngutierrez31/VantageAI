## Mission

Build VantageAI as the security operating system for lean teams under procurement pressure.

This repository is the product codebase for `app.vantageciso.com`. Extend the existing multi-tenant app and its existing workflows. Do not create side apps, disconnected prototypes, or a separate marketing experience here.

## Commercial Priorities

Build modules in this order:

1. TrustOps
2. Pulse
3. AI Governance
4. Response Ops

Prioritize work that:

- shortens questionnaire turnaround
- improves procurement readiness
- strengthens executive visibility
- increases recurring operational value
- supports multi-module annual contracts
- converts service-led trust work into sticky software workflows

## Existing Product Surfaces To Extend First

Prefer extending these surfaces before inventing anything net new:

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

## Shared Data Model Expectations

Every new workflow should fit the current tenant-scoped, audit-aware product model.

Rules:

- persist durable records for meaningful outputs
- keep all data tenant-scoped
- prefer explicit Prisma models over opaque JSON blobs when the workflow needs lifecycle, review, export, or reporting
- connect new records to existing objects where possible: questionnaires, trust inbox items, evidence, controls, tasks, reports, audit logs
- use timestamps, creator identity, reviewer identity, and status fields for operator-facing workflows
- reuse current auth/session and RBAC patterns

## AI Workflow Rules

All AI-assisted workflows must:

- use tenant-scoped data only
- cite sources when evidence exists
- store confidence explicitly
- distinguish strong support from weak or missing support
- force review for low-confidence or high-stakes outputs
- write durable product records
- write audit history
- avoid invented facts, fabricated commitments, or false claims of evidence

Copilot is a workflow launcher and skill runner, not a generic chatbot.

## Engineering Guardrails

- ship the smallest complete vertical slice that works end to end
- reuse existing routes, services, panels, entitlements, and audit patterns
- keep validation explicit with Zod and typed route payloads
- prefer practical operator workflows over abstract framework building
- add tests for critical behavior before considering the slice complete
- keep navigation and tenant experience stable
- default to polished, operator-friendly UI over placeholder admin tables

## What Not To Build Yet

Do not spend time on:

- heavyweight EASM
- generic compliance clone behavior
- consumer or prosumer tools
- disconnected AI chat surfaces
- side apps outside this repository
- speculative billing complexity beyond existing entitlement patterns

## Commercial Lens For Prioritization

When tradeoffs appear, favor work that:

- helps teams answer buyer diligence faster
- makes evidence and approved answers reusable
- gives leaders one clear posture and ownership view
- creates reasons to return weekly, not just during audits
- improves attach rate across TrustOps, Pulse, AI Governance, and Response Ops
