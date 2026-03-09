---
name: vantage-ai-governance-summary
description: Summarize AI Governance posture for Command Center, Pulse, and leadership review contexts. Use when operators need a durable AI adoption and approval summary tied to real in-app governance records.
---

# Vantage AI Governance Summary

## Trigger conditions

- Generate AI Governance Summary
- AI adoption posture review
- Command Center or Pulse AI metrics update
- Leadership summary of pending AI decisions and risks

## Workflow

1. Load the tenant-scoped AI Governance summary state from use cases, vendor reviews, findings, and risks.
2. Count pending reviews, high-risk items, rejected items, and conditional approvals.
3. Identify top AI risks, outstanding decisions, and linked Pulse impacts.
4. Produce an operator-readable and leadership-readable summary.
5. Persist or surface the output in Command Center, Pulse, or board-review context as appropriate.

## Required behavior

- Use tenant-scoped records only.
- Separate measured counts from generated narrative.
- Highlight open decisions, review backlog, and Pulse-linked exposure.
- Avoid vague AI commentary that is not grounded in app records.

## Structured output

- `reporting_period`
- `total_use_cases`
- `high_risk_count`
- `pending_reviews`
- `rejected_count`
- `conditional_approval_count`
- `top_ai_risks`
- `decisions_needed`
- `linked_risk_ids`
- `linked_finding_ids`
- `notes`

## Product mapping

- Persist outputs to summary views, executive dashboards, or leadership reporting flows when needed.
- Feed Command Center and Pulse operator metrics with durable, tenant-scoped counts.
- Write audit history if the summary is exported or attached to executive reporting.
