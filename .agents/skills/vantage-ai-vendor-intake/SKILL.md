---
name: vantage-ai-vendor-intake
description: Review a proposed AI vendor or product for security, governance, data-handling, and approval conditions. Use when a tenant needs an AI vendor intake, third-party AI review, or approval-gated vendor assessment tied to AI use cases.
---

# Vantage AI Vendor Intake

## Trigger conditions

- Start AI Vendor Intake
- AI vendor or provider review
- Third-party AI due diligence
- Retention, training, logging, or DPA assessment for an AI product

## Workflow

1. Load the tenant-scoped vendor review record or gather the input required to create one.
2. Capture vendor, product, model provider, deployment type, and linked AI use cases.
3. Evaluate retention, training-on-customer-data behavior, subprocessors, logging, authentication, and DPA status.
4. Map the vendor review to data classes and linked policy requirements.
5. Determine risk tier, approval decision, required conditions, and follow-up items.
6. Persist the result to the AI vendor review record and linked findings, risks, or tasks when required.

## Required behavior

- Use tenant-scoped data only.
- Distinguish known, unknown, and unsafe vendor behaviors explicitly.
- Flag missing retention terms, unknown subprocessors, weak logging, and unsupported authentication as review pressure.
- Force review for unresolved blockers or incomplete third-party handling information.
- Never approve a vendor implicitly when intake evidence is incomplete.

## Structured output

- `vendor_review_id` or `candidate_vendor_review_id`
- `vendor_name`
- `product_name`
- `use_case_refs`
- `data_classes`
- `retention_status`
- `training_on_customer_data_status`
- `subprocessors_status`
- `required_followups`
- `risk_tier`
- `decision`
- `decision_conditions`
- `reviewer_required`
- `linked_policy_ids`
- `linked_finding_ids`
- `linked_risk_ids`
- `notes`

## Product mapping

- Persist outputs to the AI vendor intake workflow in the app.
- Update linked AI use cases where the vendor review changes approval posture.
- Create or sync findings, Pulse risks, and follow-up tasks when intake issues remain unresolved.
- Write audit history for intake creation, assignment, due-date updates, and decisions.
