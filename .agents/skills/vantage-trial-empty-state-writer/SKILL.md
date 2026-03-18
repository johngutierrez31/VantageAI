---
name: vantage-trial-empty-state-writer
description: Write or review blank-state copy for VantageAI trial workspaces so empty modules teach the first operator action, the expected output, and the next click without leaking demo storytelling or packaging-heavy upsell language. Use when updating empty states in TrustOps, Pulse, AI Governance, Response Ops, Policies, or Findings for trial tenants.
---

# Vantage Trial Empty State Writer

## Required behavior

1. Write empty states for blank trial workspaces, not for seeded demo tenants.
2. Explain what the module is for in plain operator language.
3. Tell the user the first action to take now.
4. Tell the user what artifact or output they will get.
5. Give one strong CTA per empty state.
6. Keep copy concise and practical.
7. Remove demo-only or packaging-only language from trial-mode empty states.

## Writing pattern

Use this structure whenever possible:

- `what this module does`
- `what to do first`
- `what output you will get`
- `single CTA`

Example framing:

- TrustOps: answer or import the first questionnaire to create a reusable response set.
- Pulse: generate the first snapshot to establish posture, risks, and leadership-ready outputs.
- AI Governance: register the first use case to create an approval trail and linked findings.
- Response Ops: start the first incident or tabletop to capture a durable decision record.
- Policies: generate the first policy pack to create a reusable evidence artifact.

## Guardrails

- Do not imply that sample data already exists in a trial workspace.
- Do not mention demos, walkthroughs, or sales storytelling in trial copy.
- Do not over-promise unsupported imports or migrations.
- Do not hide the real output behind vague CTA text like `Learn more`.

## Expected output

- `module`
- `audience`
- `trial_empty_state_copy`
- `cta_target`
- `output_artifact`
- `demo_copy_removed`

## Product mapping

- Prefer existing `EmptyState` components and module dashboard cards.
- Keep CTA targets aligned with real forms, anchors, and workflow launchers already in the repo.
- Use this skill alongside trial onboarding work when several modules need blank-state updates at once.
