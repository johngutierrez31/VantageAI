# Vantage Jira Sync Planner

## Purpose

Push a high-value Vantage work item into Jira using the tenant-scoped Jira connector and keep the external link durable inside Vantage.

## Use When

- A finding, risk, roadmap item, or incident follow-up task should become tracked execution work in Jira.
- The user wants a practical create/update sync, not a speculative two-way integration.
- The user needs clarity on what Jira project and mapping will be used.

## Workflow

1. Confirm the tenant has an active Jira connector in `/app/settings/connectors`.
2. Identify the Vantage source record and confirm it is one of the supported sync types.
3. State the Jira project, issue type, and status mapping that will apply.
4. Run the sync through the Jira connector action.
5. Confirm the linked external issue key or explain the failure cleanly.

## Guardrails

- Do not invent Jira transitions or claim full two-way sync.
- Keep the sync source anchored to a durable Vantage record.
- If live Jira credentials are not configured, use simulated mode explicitly instead of pretending the issue was created externally.

## Output

- Source record
- Jira target project and issue type
- Resulting issue key or simulated key
- Any follow-up needed for live configuration
