import { readdir, readFile } from 'fs/promises';
import path from 'path';

export type InstalledSkill = {
  name: string;
  description: string;
  paths: string[];
};

const SKILL_ROOTS = ['.codex/skills', '.agents/skills'] as const;

function parseFrontmatter(markdown: string): { name: string; description: string } | null {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const lines = match[1].split(/\r?\n/);
  let name = '';
  let description = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('name:')) {
      name = line.slice('name:'.length).trim().replace(/^['"]|['"]$/g, '');
      continue;
    }

    if (!line.startsWith('description:')) continue;

    const raw = line.slice('description:'.length).trim();
    if (raw === '>-' || raw === '>' || raw === '|' || raw === '|-') {
      const chunks: string[] = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j];
        if (!/^\s+/.test(next)) break;
        chunks.push(next.trim());
        i = j;
      }
      description = chunks.join(' ').replace(/\s+/g, ' ').trim();
    } else {
      description = raw.replace(/^['"]|['"]$/g, '').trim();
    }
  }

  if (!name) return null;
  return { name, description: description || 'No description provided.' };
}

async function findSkillFiles(rootAbs: string): Promise<string[]> {
  const entries = await readdir(rootAbs, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(rootAbs, entry.name);
    if (entry.isDirectory()) {
      const nested = await findSkillFiles(full);
      files.push(...nested);
      continue;
    }
    if (entry.isFile() && entry.name === 'SKILL.md') {
      files.push(full);
    }
  }

  return files;
}

export async function getInstalledSkills(): Promise<InstalledSkill[]> {
  const skillsByName = new Map<string, InstalledSkill>();

  for (const root of SKILL_ROOTS) {
    const rootAbs = path.join(process.cwd(), root);
    let files: string[] = [];

    try {
      files = await findSkillFiles(rootAbs);
    } catch {
      continue;
    }

    for (const file of files) {
      const markdown = await readFile(file, 'utf8');
      const frontmatter = parseFrontmatter(markdown);
      if (!frontmatter) continue;

      const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');
      const existing = skillsByName.get(frontmatter.name);

      if (!existing) {
        skillsByName.set(frontmatter.name, {
          name: frontmatter.name,
          description: frontmatter.description,
          paths: [relPath]
        });
        continue;
      }

      if (!existing.paths.includes(relPath)) {
        existing.paths.push(relPath);
      }
    }
  }

  return Array.from(skillsByName.values()).sort((a, b) => a.name.localeCompare(b.name));
}
