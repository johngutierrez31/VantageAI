---
name: vantage-stack-import-planner
description: Plan a narrow, durable import into Vantage from existing spreadsheets or connector exports. Use when teams want to bring in findings, risks, approved answers, or incidents without pretending unsupported direct migrations exist.
---

# Vantage Stack Import Planner

## Trigger conditions

- Existing findings, risks, approved answers, or incidents need to move into Vantage.
- A user asks how to import data from spreadsheets, Jira exports, or similar systems.
- Adoption planning needs a realistic first migration slice.

## Required behavior

1. Import only supported record types: findings, risks, approved answers, and incidents.
2. Be explicit about the source method: manual paste, CSV, or connector-assisted export.
3. Prefer compact, high-signal imports over bulk historical noise.
4. Preserve tenant scoping, durable records, and audit visibility.
5. Never claim a direct provider API import unless it truly exists locally.

## Structured output

- `import_target`
- `supported_source_mode`
- `required_fields`
- `operator_preparation`
- `durable_records_created`
- `follow_up_after_import`

## Product mapping

- Use `Adoption Mode` and the `/api/adoption/imports` workflow.
- Reference configured connectors only when the import is explicitly connector-assisted.
- Route imported records into `Findings`, `Pulse`, `TrustOps`, or `Response Ops` after creation.
