# Risk Decision Model

Use this decision model for each security issue:

1. Is exploit evidence active and relevant to our stack?
2. Is the asset internet-facing or identity-critical?
3. What is blast radius (data, revenue, operations, trust)?
4. Can we mitigate quickly, or only partially?
5. What is the due date and accountable owner?

## Decision outcomes

- `Fix now`:
  - Active exploitation or identity compromise risk on critical systems.
- `Mitigate + track`:
  - Medium risk with viable compensating controls and dated follow-up.
- `Accept temporarily`:
  - Low-to-medium risk with explicit business approval and expiry.
- `Escalate`:
  - High business risk blocked by budget, architecture, or ownership constraints.

## Required metadata

- Priority (`P0`, `P1`, `P2`)
- Owner
- Due date
- Verification evidence
- Residual risk statement

