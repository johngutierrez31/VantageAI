---
name: vantage-trial-onboarding-planner
description: Plan or refine the first-run VantageAI trial experience for blank workspaces using concise onboarding, checklist progress, and guided empty states tied to real TrustOps, Pulse, AI Governance, Response Ops, and policy workflows. Use when shaping Command Center, Tools Hub, or module entry pages for new trial tenants.
---

# Vantage Trial Onboarding Planner

## Required behavior

1. Start trial users in a blank workspace, not a demo story.
2. Show trial status, days remaining, and the next best action near the top of the experience.
3. Tie onboarding steps to real durable workflows already available in the product.
4. Keep onboarding concise. Favor five or fewer high-signal starter actions over long tours or marketing copy.
5. Prefer operator language: what to do first, what output appears, and why it matters.
6. Keep demo storytelling available only for demo workspaces.

## Checklist design

- Include a TrustOps start action such as importing or answering the first questionnaire.
- Include a Pulse start action such as generating the first snapshot.
- Include an AI Governance action only if the module is present locally.
- Include a Response Ops action only if the module is present locally.
- Include a policy or evidence action that creates a reusable artifact.

Each checklist item should define:

- `title`
- `description`
- `href`
- `actionLabel`
- `outputLabel`
- completion logic grounded in tenant data

## Workflow

### 1. Read the tenant state

- Check whether the tenant is `TRIAL`, whether the trial is active, and which starter records already exist.
- Use existing tenant-scoped models such as questionnaires, pulse snapshots, AI use cases, incidents, tabletops, evidence, or trust docs to calculate progress.

### 2. Place onboarding at the top of the product

- Prefer `Command Center` and `Tools Hub` as the first-run surfaces.
- Keep the first card immediately actionable and avoid burying the primary CTA below commercial or demo content.

### 3. Keep progress honest

- Mark steps complete only when the underlying durable record exists.
- Do not infer completion from navigation or transient UI state alone.

## Expected output

- `trial_entry_surface`
- `starter_checklist`
- `completion_signals`
- `empty_state_dependencies`
- `trial_countdown_copy`

## Product mapping

- Extend the current app shell, Command Center, Tools Hub, and module dashboards before inventing new onboarding surfaces.
- Reuse existing CTA targets and durable record queries.
- Avoid long setup wizards, fake sample completion, or packaging-heavy trial onboarding.
