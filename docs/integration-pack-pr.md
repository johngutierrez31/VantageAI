# Integration Pack PR

## Summary

Add a narrow connector foundation so Vantage can work alongside the tools teams already use without turning the app into a general-purpose integration platform.

## Included

- tenant-scoped connector config, health, activity, and object-link models
- Slack notifications for high-signal events plus manual send
- Jira outbound sync for findings, risks, tasks, and roadmap items
- Confluence publishing for share-safe artifacts
- outbound webhook delivery for the same narrow event model
- connector settings and health page
- Tools Hub and Copilot surfacing
- seeded demo connectors and validation coverage

## Intentionally deferred

- full Google Drive live publishing
- deep two-way Jira transition automation
- broad connector marketplace or iPaaS behavior

## Risk controls

- simulated mode is explicit and validation-friendly
- live mode requires concrete provider configuration
- internal-only content stays inside existing TrustOps and export boundaries
- connector actions write durable activity plus audit logs
