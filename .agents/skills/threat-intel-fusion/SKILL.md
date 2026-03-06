---
name: threat-intel-fusion
description: Fuse multiple cybersecurity intelligence sources into an operator-ready threat brief with clear priorities and actions. Use when asked for threat trends, weekly intel digests, executive cyber updates, or translating CTI signals into backlog tasks.
---

# Threat Intel Fusion

Use this skill to combine source signals into practical actions.

## Workflow

1. Collect trusted signals from primary sources (vendor reports, national CERTs, standards bodies).
2. Normalize each signal into:
- trend title,
- confidence,
- observed window,
- likely business impact,
- required operator action.
3. Remove duplicates and collapse overlapping signals.
4. Rank by:
- active exploitation,
- identity abuse potential,
- internet exposure,
- operational blast radius.
5. Output a short threat brief plus top action queue.

## Required Output

- Top 5 trends with confidence and source links.
- `Now / Next / Later` response plan.
- Explicit assumptions and unknowns.

## References

- Source quality order: [references/source-priority.md](references/source-priority.md)
- Brief template: [references/brief-template.md](references/brief-template.md)

