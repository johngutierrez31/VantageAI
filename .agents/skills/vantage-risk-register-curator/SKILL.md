---
name: vantage-risk-register-curator
description: Create, normalize, prioritize, and maintain Pulse risk register items from findings, evidence gaps, overdue work, assessments, and manual operator input. Use when leadership needs a living cyber risk register with practical ownership and due dates.
---

# Vantage Risk Register Curator

## Trigger conditions

- TrustOps findings, evidence gaps, or assessment gaps need executive risk framing.
- Operators need to sync or normalize auto-sourced risks into one tenant-scoped register.
- Leadership needs filters by owner, severity, source module, or overdue status.
- A board brief or roadmap needs current top risks.

## Required behavior

1. Use tenant-scoped findings, tasks, questionnaires, Evidence Maps, trust packets, and assessments only.
2. Normalize duplicate risks narrowly using source references and materially similar risk statements.
3. Preserve source type, source references, owner, target due date, and linked product records.
4. Keep severity, likelihood, and impact explicit and explainable.
5. Distinguish manual risks from auto-sourced risks.
6. Do not close or downgrade risks without preserving auditability.
7. Feed the top open risks into Pulse snapshots, board briefs, and roadmap generation.

## Structured output

- `risk_id`
- `candidate_risk_id`
- `title`
- `normalized_risk_statement`
- `source_type`
- `source_refs`
- `severity`
- `likelihood`
- `impact`
- `owner_id`
- `recommended_status`
- `recommended_due_at`
- `linked_control_ids`
- `linked_finding_ids`
- `linked_task_ids`
- `notes`

## Product mapping

- Persist to `RiskRegisterItem`.
- Link risks back to `Finding`, `Task`, `Assessment`, `QuestionnaireUpload`, `EvidenceMap`, and `TrustPacket` where relevant.
- Surface top risks in Pulse, Command Center, Board Brief, and Quarterly Review workflows.
