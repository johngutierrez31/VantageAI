# Vantage Slack Notifier

## Purpose

Route a high-signal Vantage event into Slack using the tenant-scoped connector configuration and a clear deep link back into the originating workflow.

## Use When

- An operator wants to push a TrustOps, Pulse, or Response Ops update into Slack.
- A workflow needs a durable Slack notification record in Vantage.
- The user wants to confirm which Slack connector and event path will be touched before sending.

## Workflow

1. Confirm the tenant has an active Slack connector in `/app/settings/connectors`.
2. State the exact Vantage record or workflow being shared.
3. Keep the message narrow: event, why it matters, next click.
4. Include a deep link back into the relevant Vantage page when possible.
5. Trigger the send through the connector action so activity is logged durably.

## Guardrails

- Do not claim Slack delivery happened if the connector is disabled or missing.
- Do not send internal-only notes, reviewer comments, or unapproved buyer content.
- Prefer existing event types such as buyer request received, incident created, quarterly review ready, or manual notification.

## Output

- Connector used
- Message summary
- Deep link target
- Delivery result or failure reason
