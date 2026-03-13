# Vantage Doc Publisher

## Purpose

Publish a share-safe Vantage artifact into the configured document connector while preserving the approved buyer- or leadership-facing formatting.

## Use When

- A board brief, quarterly review, trust packet summary, or after-action report should be published externally.
- The operator wants to know exactly which artifact and connector will be touched.
- The team needs durable publish activity and an external object link recorded inside Vantage.

## Workflow

1. Confirm the tenant has an active publishing connector in `/app/settings/connectors`.
2. Confirm the artifact is the correct share-safe version for the audience.
3. Publish through the connector action so Vantage stores the activity and external link.
4. Report the destination, title, and resulting external URL when available.

## Guardrails

- Do not publish internal-only trust packet notes or review commentary.
- Do not claim Google Drive is live if the tenant is still using the scaffolded placeholder.
- Prefer the existing artifact exporters instead of rebuilding formatting ad hoc.

## Output

- Artifact published
- Connector used
- Destination URL or simulated result
- Any publish-safe caveats
