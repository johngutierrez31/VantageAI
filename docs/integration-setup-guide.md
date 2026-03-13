# Integration Setup Guide

## Scope

This phase adds a narrow connector foundation for tenant-scoped external delivery from the Vantage app:

- Slack notifications
- Jira work-item sync
- Confluence document publishing
- outbound webhook notifications
- Google Drive placeholder scaffolding

All connectors are configured in `/app/settings/connectors`.

## Operating Modes

- `SIMULATED`: safe for demos, local validation, and rollout prep. Actions persist connector activity and linked objects without touching an external system.
- `LIVE`: sends data to the configured external system and records health plus activity in Vantage.

## Slack

### Supported value

- buyer request received
- incident created
- quarterly review ready
- manual notification

### Required live settings

- connector mode `LIVE`
- webhook URL
- optional default channel label
- optional enabled event list

## Jira

### Supported sync sources

- findings
- risks
- tasks
- roadmap items

### Required live settings

- Jira base URL
- project key
- issue type
- email
- API token
- optional status mapping lines

### Notes

- Vantage stores a durable Jira object link after create or update.
- The sync is intentionally outbound-first. It does not claim full two-way status automation.

## Confluence

### Supported publish sources

- trust packet summaries
- board briefs
- after-action reports
- quarterly reviews

### Required live settings

- Confluence base URL
- space key
- email
- API token
- optional parent page ID

## Outbound Webhook

### Supported value

- narrow event fan-out for the same high-signal events used by Slack

### Required live settings

- target webhook URL
- optional signing secret
- optional enabled event list

## Google Drive

Google Drive is intentionally scaffolded in this phase. The connector surface and health model exist, but live publishing is deferred until an auth-safe provider pattern is available.

## Health And Audit

Every connector action writes:

- connector activity
- latest health status
- recent error details when present
- audit log entries for configuration, testing, and operator-triggered actions

## Safety Rules

- keep connector configuration tenant-scoped
- do not publish internal-only or unapproved buyer content
- prefer the existing export helpers for document payloads
- use simulated mode if credentials are missing rather than pretending live delivery succeeded
