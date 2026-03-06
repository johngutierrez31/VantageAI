---
name: solo-ciso-operating-system
description: Build and run a one-person cybersecurity operating cadence across command center, vulnerability prioritization, incident readiness, trust responses, and policy governance. Use when requests involve "solo CISO", "one-person security team", weekly cyber priorities, or creating an end-to-end security operating model.
---

# Solo CISO Operating System

Use this skill to turn broad security goals into an executable cadence for one security owner.

## Workflow

1. Establish operating context:
- Business profile, crown-jewel systems, compliance targets, and current backlog pressure.

2. Build the mission stack:
- Daily mission (highest-risk action),
- Weekly burn-down (vulnerabilities, evidence, trust requests),
- Monthly assurance cycle (policies, tabletop, executive report).

3. Prioritize by exploitability and blast radius:
- Favor active exploitation and identity exposure over cosmetic findings.

4. Assign each task to an execution surface:
- `Command Center` for prioritization,
- `Findings` for remediation,
- `Security Analyst` for incident/threat analysis,
- `Trust Inbox` for customer assurance output,
- `Policies` for governance updates.

5. Produce operator output:
- 7-day mission queue,
- 30-day risk reduction plan,
- Decision log (accepted, deferred, escalated risks).

## Output Contract

- Keep output concise, action-first, and date-bound.
- Include explicit priorities (`P0`, `P1`, `P2`).
- Include success checks for each action.

## References

- Daily/weekly cadence: [references/daily-and-weekly-cadence.md](references/daily-and-weekly-cadence.md)
- Decision model: [references/risk-decision-model.md](references/risk-decision-model.md)

## Script

- Backlog generator: `scripts/generate-weekly-backlog.py`
  - Use to convert pulse and trend JSON into a markdown action plan.

