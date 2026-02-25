import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const sectionsSchema = z.union([z.string(), z.array(z.unknown()), z.record(z.unknown())]);

const policyTemplateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source: z.string().min(1),
  category: z.string().min(1),
  type: z.string().min(1),
  purpose: z.string().optional().default(''),
  scope: z.string().optional().default(''),
  sections: sectionsSchema.optional().default({}),
  tags: z.unknown().optional().default({}),
  frameworks: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({})
});

const policyDatasetSchema = z.object({
  metadata: z.record(z.unknown()).optional().default({}),
  policies: z.array(policyTemplateSchema)
});

export type PolicyTemplate = z.infer<typeof policyTemplateSchema>;

type PolicyDataset = z.infer<typeof policyDatasetSchema>;

export type PolicyCatalogItem = {
  id: string;
  title: string;
  source: string;
  category: string;
  type: string;
  frameworks: string[];
  tags: string[];
  wordCount: number;
};

export type PolicyCatalog = {
  metadata: Record<string, unknown>;
  policies: PolicyCatalogItem[];
  categories: string[];
  frameworks: string[];
  sources: string[];
};

let cachedPolicyDataset: PolicyDataset | null = null;

function getPolicyReferencesPath() {
  return path.join(
    process.cwd(),
    '.agents',
    'skills',
    'cybersecurity-policy-generator',
    'references',
    'policies.json'
  );
}

function asWordCount(metadata: Record<string, unknown>) {
  const value = metadata.wordCount;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort((a, b) => a.localeCompare(b));
}

function normalizeTags(value: unknown): string[] {
  const tags = new Set<string>();

  function visit(input: unknown) {
    if (typeof input === 'string') {
      if (input.trim().length > 0) tags.add(input.trim());
      return;
    }

    if (Array.isArray(input)) {
      for (const item of input) visit(item);
      return;
    }

    if (input && typeof input === 'object') {
      for (const entry of Object.values(input as Record<string, unknown>)) {
        visit(entry);
      }
    }
  }

  visit(value);
  return [...tags];
}

async function loadPolicyDataset() {
  if (cachedPolicyDataset) return cachedPolicyDataset;

  const filePath = getPolicyReferencesPath();
  const raw = await readFile(filePath, 'utf8');
  const parsed = policyDatasetSchema.parse(JSON.parse(raw));
  cachedPolicyDataset = parsed;
  return parsed;
}

export async function getPolicyCatalog(): Promise<PolicyCatalog> {
  const dataset = await loadPolicyDataset();
  const policies = dataset.policies.map((policy) => ({
    id: policy.id,
    title: policy.title,
    source: policy.source,
    category: policy.category,
    type: policy.type,
    frameworks: policy.frameworks,
    tags: normalizeTags(policy.tags),
    wordCount: asWordCount(policy.metadata)
  }));

  return {
    metadata: dataset.metadata,
    policies,
    categories: uniqueSorted(policies.map((policy) => policy.category)),
    frameworks: uniqueSorted(policies.flatMap((policy) => policy.frameworks)),
    sources: uniqueSorted(policies.map((policy) => policy.source))
  };
}

export async function getPolicyTemplatesByIds(policyIds: string[]) {
  const dataset = await loadPolicyDataset();
  const byId = new Map(dataset.policies.map((policy) => [policy.id, policy]));

  return policyIds.map((id) => byId.get(id)).filter((policy): policy is PolicyTemplate => Boolean(policy));
}
