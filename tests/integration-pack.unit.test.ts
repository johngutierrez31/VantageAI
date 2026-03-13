import { describe, expect, it } from 'vitest';
import { decryptConnectorSecret, encryptConnectorSecret } from '@/lib/integrations/crypto';
import { buildConnectorPersistencePayload } from '@/lib/integrations/payloads';

describe('integration pack foundation helpers', () => {
  it('round-trips connector secrets through encryption', () => {
    const encrypted = encryptConnectorSecret(JSON.stringify({ webhookUrl: 'https://hooks.slack.example/test' }));
    const decrypted = decryptConnectorSecret(encrypted);

    expect(decrypted).toBe(JSON.stringify({ webhookUrl: 'https://hooks.slack.example/test' }));
    expect(encrypted).not.toContain('hooks.slack.example');
  });

  it('builds provider-specific config and secret payloads', () => {
    const slack = buildConnectorPersistencePayload({
      provider: 'SLACK',
      name: 'Slack',
      description: null,
      mode: 'LIVE',
      status: 'ACTIVE',
      enabledEventKeys: ['incident_created'],
      defaultChannel: '#security',
      webhookUrl: 'https://hooks.slack.example/test'
    });

    expect(slack.configJson).toMatchObject({
      defaultChannel: '#security',
      enabledEventKeys: ['incident_created']
    });
    expect(slack.secretPayload).toMatchObject({
      webhookUrl: 'https://hooks.slack.example/test'
    });

    const jira = buildConnectorPersistencePayload({
      provider: 'JIRA',
      name: 'Jira',
      description: null,
      mode: 'LIVE',
      status: 'ACTIVE',
      jiraBaseUrl: 'https://example.atlassian.net',
      jiraProjectKey: 'SEC',
      jiraIssueType: 'Task',
      jiraEmail: 'jira@example.com',
      jiraApiToken: 'jira-api-token',
      statusMappings: [{ source: 'OPEN', target: 'to-do' }]
    });

    expect(jira.configJson).toMatchObject({
      jiraBaseUrl: 'https://example.atlassian.net',
      jiraProjectKey: 'SEC',
      jiraEmail: 'jira@example.com',
      statusMappings: [{ source: 'OPEN', target: 'to-do' }]
    });
    expect(jira.secretPayload).toMatchObject({
      jiraApiToken: 'jira-api-token'
    });
  });
});
