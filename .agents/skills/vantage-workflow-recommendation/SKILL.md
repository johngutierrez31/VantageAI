---
name: vantage-workflow-recommendation
description: Recommend the best next Vantage workflow from the operator's immediate goal. Use when Copilot, onboarding, or a teammate needs a clear module path with specific next clicks and realistic expectations.
---

# Vantage Workflow Recommendation

## Trigger conditions

- A user asks what to do next.
- Copilot or an onboarding surface needs a workflow recommendation.
- An operator has a concrete outcome but not the right module or first click.

## Required behavior

1. Anchor on the immediate outcome, such as questionnaire response, board brief, AI review, incident, or adoption fit.
2. Recommend the smallest useful workflow, not the broadest module tour.
3. Explain why the suggested workflow fits and what durable record it creates.
4. Point to follow-on workflows when the work naturally carries into another module.
5. Avoid vague advice or unsupported claims about automation depth.

## Structured output

- `goal`
- `recommended_workflow`
- `first_click`
- `durable_output`
- `follow_on_modules`
- `watchouts`

## Product mapping

- Recommend from `Adoption Mode`, `Command Center`, `Tools Hub`, `Copilot`, `TrustOps`, `Pulse`, `AI Governance`, and `Response Ops`.
- Keep workflow choices tied to existing routes and tenant-scoped records.
