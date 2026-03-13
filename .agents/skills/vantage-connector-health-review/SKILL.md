# Vantage Connector Health Review

## Purpose

Review the current connector footprint for a tenant and summarize which integrations are healthy, misconfigured, or intentionally scaffolded.

## Use When

- A user asks which connectors are configured and whether they are working.
- The operator wants a concise health summary before a demo or rollout.
- A recent connector action failed and needs triage.

## Workflow

1. Open `/app/settings/connectors`.
2. Review connector status, last health check, recent activity, linked objects, and recent errors.
3. Separate live, simulated, and scaffolded providers clearly.
4. Call out the next corrective action only when it is practical and low-risk.

## Guardrails

- Do not blur simulated validation activity with live external delivery.
- Be explicit about which external system would be touched by any retry.
- Keep the summary tied to durable connector records and activity, not guesses.

## Output

- Healthy connectors
- Connectors needing attention
- Scaffolded or deferred providers
- Recommended next operator step
