import { z } from 'zod';

const providerEnum = z.enum(['SLACK', 'JIRA', 'CONFLUENCE', 'GOOGLE_DRIVE', 'OUTBOUND_WEBHOOK']);
const connectorModeEnum = z.enum(['SIMULATED', 'LIVE']);
const connectorStatusEnum = z.enum(['ACTIVE', 'NEEDS_ATTENTION', 'DISABLED']);

export const connectorUpsertSchema = z
  .object({
    id: z.string().min(1).optional(),
    provider: providerEnum,
    name: z.string().min(3).max(120),
    description: z.string().max(500).nullable().optional(),
    mode: connectorModeEnum.default('SIMULATED'),
    status: connectorStatusEnum.default('ACTIVE'),
    enabledEventKeys: z.array(z.string().min(1).max(80)).max(20).optional(),
    defaultChannel: z.string().min(1).max(120).optional(),
    webhookUrl: z.string().url().optional(),
    jiraBaseUrl: z.string().url().optional(),
    jiraProjectKey: z.string().min(2).max(30).optional(),
    jiraIssueType: z.string().min(2).max(80).optional(),
    jiraEmail: z.string().email().optional(),
    jiraApiToken: z.string().min(10).max(400).optional(),
    statusMappings: z
      .array(
        z.object({
          source: z.string().min(1).max(80),
          target: z.string().min(1).max(80)
        })
      )
      .max(20)
      .optional(),
    confluenceBaseUrl: z.string().url().optional(),
    confluenceSpaceKey: z.string().min(1).max(80).optional(),
    confluenceParentPageId: z.string().min(1).max(80).optional(),
    confluenceEmail: z.string().email().optional(),
    confluenceApiToken: z.string().min(10).max(400).optional(),
    googleDriveFolderId: z.string().min(1).max(160).optional(),
    googleServiceAccountJson: z.string().min(2).max(20000).optional(),
    outboundWebhookUrl: z.string().url().optional(),
    outboundWebhookSecret: z.string().min(6).max(400).optional()
  })
  .superRefine((payload, ctx) => {
    if (payload.mode !== 'LIVE') return;

    if (payload.provider === 'SLACK' && !payload.webhookUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['webhookUrl'], message: 'Slack live mode requires a webhook URL' });
    }

    if (payload.provider === 'JIRA') {
      if (!payload.jiraBaseUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['jiraBaseUrl'], message: 'Jira live mode requires a base URL' });
      }
      if (!payload.jiraProjectKey) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['jiraProjectKey'], message: 'Jira live mode requires a project key' });
      }
      if (!payload.jiraEmail) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['jiraEmail'], message: 'Jira live mode requires an email' });
      }
      if (!payload.jiraApiToken) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['jiraApiToken'], message: 'Jira live mode requires an API token' });
      }
    }

    if (payload.provider === 'CONFLUENCE') {
      if (!payload.confluenceBaseUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confluenceBaseUrl'], message: 'Confluence live mode requires a base URL' });
      }
      if (!payload.confluenceSpaceKey) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confluenceSpaceKey'], message: 'Confluence live mode requires a space key' });
      }
      if (!payload.confluenceEmail) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confluenceEmail'], message: 'Confluence live mode requires an email' });
      }
      if (!payload.confluenceApiToken) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confluenceApiToken'], message: 'Confluence live mode requires an API token' });
      }
    }

    if (payload.provider === 'GOOGLE_DRIVE' && !payload.googleDriveFolderId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['googleDriveFolderId'],
        message: 'Google Drive live mode requires a folder ID'
      });
    }

    if (payload.provider === 'OUTBOUND_WEBHOOK' && !payload.outboundWebhookUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outboundWebhookUrl'],
        message: 'Outbound webhook live mode requires a target URL'
      });
    }
  });

export const connectorHealthTestSchema = z.object({
  connectorId: z.string().min(1)
});

export const slackNotificationSchema = z.object({
  connectorId: z.string().min(1),
  eventKey: z.string().min(2).max(80),
  title: z.string().min(3).max(200),
  body: z.string().min(3).max(4000),
  href: z.string().min(1).max(300).optional(),
  severity: z.enum(['info', 'warning', 'critical']).default('info')
});

export const jiraSyncSchema = z.object({
  connectorId: z.string().min(1),
  entityType: z.enum(['finding', 'risk', 'task', 'roadmap_item']),
  entityId: z.string().min(1)
});

export const documentPublishSchema = z.object({
  connectorId: z.string().min(1),
  artifactType: z.enum(['trust_packet', 'board_brief', 'after_action_report', 'quarterly_review']),
  artifactId: z.string().min(1),
  title: z.string().min(3).max(200).optional()
});
