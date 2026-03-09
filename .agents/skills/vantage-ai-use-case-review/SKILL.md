---
name: vantage-ai-use-case-review
description: Review proposed AI use cases for data exposure, vendor dependence, policy fit, risk tiering, approval conditions, and durable AI Governance registry updates. Use when an operator needs AI governance intake, policy mapping, approval decisions, or escalation guidance for AI adoption.
---

# Vantage AI Use Case Review

## Trigger conditions

- Register AI Use Case
- Review AI Use Case
- AI governance intake
- Data classification or policy-mapping review for a proposed AI workflow
- Approval or rejection decisions for tenant-scoped AI use cases

## Workflow

1. Load the tenant-scoped AI use case record or capture the intake details needed to create one.
2. Identify business owner, workflow type, vendor/provider involvement, and deployment context.
3. Classify the data involved and flag customer, regulated, and sensitive internal exposure.
4. Evaluate policy-fit, review requirements, and approval blockers.
5. Assign a risk tier, required controls, approval decision, and escalation path.
6. Persist the result to the AI Governance use-case record and linked findings, risks, or tasks when required.

## Required behavior

- Use tenant-scoped data only.
- Distinguish vendor-hosted, internal, and hybrid AI usage.
- Treat sensitive data classes, internet/tool access, and broad autonomy as escalation triggers.
- Evaluate approval blockers and unmet requirements explicitly.
- Use concrete control recommendations and decision conditions.
- Force review when high-risk, low-confidence, or high-stakes conditions exist.
- Never invent policy approval, vendor approval, or evidence that is not present in the tenant record.

## Structured output

- `use_case_id` or `candidate_use_case_id`
- `use_case_name`
- `business_owner`
- `vendor_name`
- `data_classes`
- `risk_tier`
- `primary_risks`
- `required_controls`
- `human_review_required`
- `decision`
- `decision_conditions`
- `escalation_reason`
- `linked_policy_ids`
- `linked_finding_ids`
- `linked_risk_ids`
- `linked_task_ids`
- `notes`

## Product mapping

- Persist outputs to the AI Governance use-case registry in the app.
- Update approval state, reviewer notes, due dates, and policy mapping fields.
- Create or sync linked findings, risk register items, and follow-up tasks when the decision or risk tier requires it.
- Write audit history for creation, review, assignment, and approval decisions.
