---
name: vantage-demo-vs-trial-mode-auditor
description: Audit whether VantageAI cleanly separates demo, trial, and paid workspace behavior across provisioning, entitlements, billing language, app shell copy, seeded data, and first-run UX. Use when reviewing regressions where trial users might see demo content, free-plan lockout messaging, or packaging-heavy surfaces.
---

# Vantage Demo Vs Trial Mode Auditor

## Audit questions

1. Does demo mode still point to a seeded storytelling workspace with sample data?
2. Does trial mode create a brand-new blank tenant with 14-day full access?
3. Does paid mode remain on the standard entitlement path without demo copy?
4. Is workspace mode stored durably on the tenant instead of inferred from environment alone?
5. Are seeded demo records kept out of trial workspaces?
6. Are trial users shielded from free-plan disabled messaging during the active trial?
7. Do Command Center, Tools Hub, Billing, and the app shell show mode-appropriate copy?

## What to inspect

- Prisma tenant fields and migrations
- tenant creation and trial start routes
- auth/session active-tenant selection
- entitlement and billing helpers
- demo seed and reset flows
- Command Center and Tools Hub headers or cards
- app shell badges, summaries, and tenant switcher text
- module empty states for blank trial tenants

## Findings format

- `mode_split_status`
- `demo_only_surfaces`
- `trial_only_surfaces`
- `paid_path_checks`
- `confusion_points`
- `regressions_found`
- `recommended_minimal_fixes`

## Guardrails

- Flag any place where trial falls back to demo seed data.
- Flag any place where demo copy appears for `TRIAL` or `PAID`.
- Flag any place where active trial tenants still show disabled-feature or crippled-free-plan language.
- Prefer small fixes that preserve current module workflows and tenant scoping.

## Product mapping

- Use this audit after changes to `demo-seed`, trial provisioning, entitlement logic, top-level app surfaces, or onboarding.
- Cross-check both server-side behavior and browser-visible behavior.
- Treat `demo:reset`, full validation, and tenant-scoped UI checks as part of the audit.
