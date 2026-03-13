---
name: vantage-demo-tenant-curator
description: Curate the seeded VantageAI demo tenant so it feels like a credible paid workspace with compact, cross-module, buyer-relevant records. Use when polishing demo data, entitlements, demo reset, or seeded artifact coherence.
---

# Vantage Demo Tenant Curator

## Trigger conditions

- Demo tenant polish
- Demo reset review
- Seeded workspace curation
- Cross-module seeded story cleanup

## Required behavior

1. Work only from modules and routes confirmed locally in this repository.
2. Keep the demo tenant compact, realistic, and buyer-relevant.
3. Prefer one coherent story across TrustOps, Pulse, AI Governance, and Response Ops instead of many disconnected records.
4. Make seeded artifacts feel reviewable, exportable, and owned.
5. Preserve tenant scoping, review gating, export safety, and audit-aware workflow behavior.
6. Avoid fake modules, fake integrations, noisy sample volume, or marketing-style filler data.

## Structured output

- `tenant_story`
- `confirmed_modules`
- `seeded_artifact_plan`
- `wow_path_dependencies`
- `demo_reset_notes`
- `risks_to_avoid`

## Product mapping

- Extend `Command Center`, `Tools Hub`, `TrustOps`, `Pulse`, `AI Governance`, and `Response Ops` only when those surfaces already exist locally.
- Update demo seed/reset flows and durable records rather than inventing side-demo code.
- Keep seeded exports and packet/share modes aligned with current product behavior.
