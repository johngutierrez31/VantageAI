'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function normalizeQuery(query: string): string {
  const cleaned = query.trim().replace(/\s+/g, ' ');
  return cleaned.length ? cleaned : '<query>';
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

export function SkillsDemoWidget() {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');

  const findCommand = useMemo(() => `npx skills find ${normalizeQuery(query)}`, [query]);
  const addCommand = 'npx skills add vercel-labs/skills --skill find-skills';

  async function handleCopy(value: string, label: string) {
    await copyText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1200);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Skill Finder Demo</CardTitle>
        <p className="text-sm text-muted-foreground">
          This is a copy-and-paste helper only. It does not execute CLI commands in the browser.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="block font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Find a skill for:
          </label>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="threat modeling, policy generation, incident response..."
          />
        </div>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Command 1</p>
            <p className="mt-1 overflow-x-auto font-mono text-sm text-foreground">{findCommand}</p>
            <Button className="mt-3" variant="secondary" size="sm" onClick={() => handleCopy(findCommand, 'find')}>
              Copy find command
            </Button>
          </div>

          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Command 2</p>
            <p className="mt-1 overflow-x-auto font-mono text-sm text-foreground">{addCommand}</p>
            <Button className="mt-3" variant="secondary" size="sm" onClick={() => handleCopy(addCommand, 'add')}>
              Copy add command
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{copied ? `Copied ${copied} command.` : 'Ready to copy.'}</p>
      </CardContent>
    </Card>
  );
}
