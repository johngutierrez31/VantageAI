---
name: vantage-ai-policy-mapper
description: Map AI use cases and AI vendor reviews to data classes, policy requirements, restrictions, and approval blockers. Use when operators need a clear approval basis instead of ad hoc AI guidance.
---

# Vantage AI Policy Mapper

## Trigger conditions

- Map AI Policies
- Review data classes for an AI workflow
- Determine approval blockers or required conditions
- Compare AI use cases against tenant policy expectations

## Workflow

1. Load the tenant-scoped AI use case or vendor review record.
2. Inspect declared data classes, deployment context, workflow type, and vendor signals.
3. Match relevant policy records or policy-generator outputs.
4. Determine required conditions, unmet requirements, prohibited conditions, and approval blockers.
5. Persist the mapped policy results back into the AI Governance record.

## Required behavior

- Use tenant-scoped records only.
- Keep the evaluation explicit and explainable.
- Distinguish matched requirements from unmet requirements and blockers.
- Never fabricate a policy record or claim approval without a supporting mapped rule.

## Structured output

- `use_case_id`
- `matched_policy_ids`
- `required_conditions`
- `unmet_requirements`
- `prohibited_conditions`
- `approval_blockers`
- `recommended_decision`
- `notes`

## Product mapping

- Persist outputs to AI Governance policy-mapping fields on AI use cases or vendor reviews.
- Support reviewer decisions, queue operations, and downstream findings or risks.
- Write audit history when policy conditions materially change approval posture.
