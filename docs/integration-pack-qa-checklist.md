# Integration Pack QA Checklist

## Connector Settings

- [ ] `/app/settings/connectors` loads without empty-state failure
- [ ] Slack, Jira, Confluence, outbound webhook, and Google Drive cards are visible
- [ ] health state, recent activity, and linked objects are visible when seeded
- [ ] connector save path works for simulated mode
- [ ] connector health checks return visible results

## Slack

- [ ] manual Slack notification succeeds in simulated mode
- [ ] incident-created event records connector activity
- [ ] buyer-request-received event records connector activity
- [ ] quarterly-review-ready event records connector activity

## Jira

- [ ] a risk can be synced through the Jira action
- [ ] connector activity is recorded for the sync
- [ ] connector object link is stored for the synced item

## Document Publishing

- [ ] a board brief can be published through the document connector
- [ ] connector activity is recorded for the publish
- [ ] connector object link is stored for the published artifact
- [ ] publish-safe formatting is preserved in the generated artifact payload

## Tools And Copilot

- [ ] Tools Hub shows Configure Connectors
- [ ] Tools Hub shows Send to Slack
- [ ] Tools Hub shows Sync to Jira
- [ ] Tools Hub shows Publish to Docs
- [ ] Copilot recommends Connector Health for connector-related prompts

## Demo Seed

- [ ] demo reset seeds simulated Slack, Jira, Confluence, and outbound webhook connectors
- [ ] seeded activity appears on the connector page
- [ ] seeded links appear for Jira and Confluence

## Validation

- [x] serial validation commands pass
- [x] full validation exercises connector UI and API paths
