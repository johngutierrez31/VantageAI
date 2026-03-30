import { describe, expect, it } from 'vitest';
import { canAccessModule, getModuleRequirement } from '@/lib/billing/module-access';

describe('module access rules', () => {
  it('maps route prefixes to module requirements', () => {
    expect(getModuleRequirement('/app/trust')).toBe('trustops');
    expect(getModuleRequirement('/app/pulse/roadmap')).toBe('pulse');
    expect(getModuleRequirement('/api/ai-governance/use-cases')).toBe('ai-governance');
    expect(getModuleRequirement('/api/response-ops/incidents')).toBe('response-ops');
    expect(getModuleRequirement('/app/command-center')).toBeNull();
  });

  it('enforces plan thresholds for paid workspaces', () => {
    expect(canAccessModule({ moduleId: 'trustops', plan: 'FREE', workspaceMode: 'PAID' })).toBe(false);
    expect(canAccessModule({ moduleId: 'trustops', plan: 'STARTER', workspaceMode: 'PAID' })).toBe(true);
    expect(canAccessModule({ moduleId: 'pulse', plan: 'STARTER', workspaceMode: 'PAID' })).toBe(false);
    expect(canAccessModule({ moduleId: 'pulse', plan: 'PRO', workspaceMode: 'PAID' })).toBe(true);
    expect(canAccessModule({ moduleId: 'ai-governance', plan: 'PRO', workspaceMode: 'PAID' })).toBe(false);
    expect(canAccessModule({ moduleId: 'response-ops', plan: 'ENTERPRISE', workspaceMode: 'PAID' })).toBe(true);
  });

  it('keeps demo and trial workspaces fully unlocked', () => {
    expect(canAccessModule({ moduleId: 'response-ops', plan: 'FREE', workspaceMode: 'DEMO' })).toBe(true);
    expect(canAccessModule({ moduleId: 'response-ops', plan: 'FREE', workspaceMode: 'TRIAL' })).toBe(true);
  });
});

