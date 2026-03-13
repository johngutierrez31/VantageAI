# Overlay Positioning Summary

## Goal

Reduce buyer and operator confusion by making Vantage easier to understand as the security operating layer that works with an existing stack.

## What changed

- Added `Adoption Mode` as a real in-app onboarding and import surface at `/app/adoption`.
- Added durable tenant-scoped `AdoptionImport` records for imported findings, risks, approved answers, and incidents.
- Added `/api/adoption/imports` for manual, CSV, and connector-assisted export imports.
- Updated `Command Center`, `Tools Hub`, navigation, search, contextual help, and Copilot routing so the operating-layer story is visible in product.
- Reframed module catalog and module headers so TrustOps, Pulse, AI Governance, and Response Ops read as connected layers instead of disconnected tools.
- Seeded the demo tenant with adoption import history so the new page is populated after `demo:reset`.
- Added repo-local skills for adoption onboarding, import planning, value-path explanation, and workflow recommendation.

## Practical product outcome

- New users can see where to start from `Adoption Mode`, `Tools Hub`, `Command Center`, or `Copilot`.
- Teams can import a narrow slice of current work without pretending direct competitor migrations exist.
- The cross-module path from trust work to risk, roadmap, board reporting, and incident carry-over is now explicit.
- The suite now reads more clearly as an operating layer that can sit above existing Slack, Jira, Confluence, and spreadsheet-driven processes.

## Key files

- Product surfaces:
  - `src/app/app/adoption/page.tsx`
  - `src/components/app/adoption-mode-panel.tsx`
  - `src/app/app/command-center/page.tsx`
  - `src/app/app/tools/page.tsx`
  - `src/app/app/layout.tsx`
  - `src/components/app/trust-packet-panel.tsx`
  - `src/components/app/pulse-dashboard-panel.tsx`
  - `src/components/app/ai-governance-dashboard-panel.tsx`
  - `src/components/app/response-ops-dashboard-panel.tsx`
- Adoption workflow:
  - `src/app/api/adoption/imports/route.ts`
  - `src/lib/adoption/imports.ts`
  - `src/lib/adoption/adoption-mode.ts`
  - `src/lib/validation/adoption.ts`
- Positioning copy and guided routing:
  - `src/lib/product/module-catalog.ts`
  - `src/lib/product/contextual-help.ts`
  - `src/app/api/copilot/route.ts`
  - `src/components/copilot-panel.tsx`
- Data model and seeded state:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260312190000_overlay_positioning_adoption_mode/migration.sql`
  - `prisma/demo-support.ts`
  - `prisma/demo-suite-story.ts`

## Known limitations

- Imports are intentionally narrow and operator-driven. This phase does not add direct competitor API migrations.
- Connector-assisted imports label exported data from configured connectors; they do not claim full provider pull or two-way migration.
- The value graph favors clarity over heavy graph modeling and surfaces the strongest current record path in the tenant.
