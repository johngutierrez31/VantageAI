'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Eye, Search } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { EmptyState } from '@/components/app/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type TemplateCard = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  frameworkTag: 'Security' | 'AI' | 'General';
  domainCount: number;
  controlCount: number;
  questionCount: number;
};

export function TemplatesGrid({ templates }: { templates: TemplateCard[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<'all' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<'all' | 'Security' | 'AI' | 'General'>('all');
  const [search, setSearch] = useState('');
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return templates.filter((template) => {
      if (statusFilter !== 'all' && template.status !== statusFilter) return false;
      if (frameworkFilter !== 'all' && template.frameworkTag !== frameworkFilter) return false;
      if (!needle) return true;
      return (
        template.name.toLowerCase().includes(needle) ||
        template.frameworkTag.toLowerCase().includes(needle)
      );
    });
  }, [frameworkFilter, search, statusFilter, templates]);

  async function duplicateTemplate(templateId: string) {
    setBusyTemplateId(templateId);
    const response = await fetch(`/api/templates/${templateId}/duplicate`, { method: 'POST' });
    setBusyTemplateId(null);
    if (response.ok) router.refresh();
  }

  async function publishTemplate(templateId: string) {
    setBusyTemplateId(templateId);
    const response = await fetch(`/api/templates/${templateId}/publish`, { method: 'POST' });
    setBusyTemplateId(null);
    if (response.ok) router.refresh();
  }

  async function unpublishTemplate(templateId: string) {
    setBusyTemplateId(templateId);
    const response = await fetch(`/api/templates/${templateId}/publish`, { method: 'DELETE' });
    setBusyTemplateId(null);
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Build and govern reusable assessment frameworks across security and AI readiness programs."
        primaryAction={{ label: 'Create Template', href: '/app/templates/new' }}
      />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
          <Select
            value={frameworkFilter}
            onChange={(event) => setFrameworkFilter(event.target.value as typeof frameworkFilter)}
          >
            <option value="all">All frameworks</option>
            <option value="Security">Security</option>
            <option value="AI">AI</option>
            <option value="General">General</option>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No templates match this filter"
          description="Create a template to standardize domains, controls, and questionnaires for your team."
          actionLabel="Create Template"
          actionHref="/app/templates/new"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((template) => (
            <Card key={template.id} className="bg-card/95">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{template.name}</CardTitle>
                  <StatusPill status={template.status} />
                </div>
                <CardDescription>Updated {new Date(template.updatedAt).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">Framework: {template.frameworkTag}</p>
                <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/20 p-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Domains</p>
                    <p className="text-lg font-semibold">{template.domainCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Controls</p>
                    <p className="text-lg font-semibold">{template.controlCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Questions</p>
                    <p className="text-lg font-semibold">{template.questionCount}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/app/templates/${template.id}`}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> View
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyTemplateId === template.id}
                  onClick={() => duplicateTemplate(template.id)}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
                </Button>
                {template.status === 'PUBLISHED' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyTemplateId === template.id}
                    onClick={() => unpublishTemplate(template.id)}
                  >
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busyTemplateId === template.id}
                    onClick={() => publishTemplate(template.id)}
                  >
                    Publish
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Template Marketplace (internal preview)</CardTitle>
          <CardDescription>
            Future: import vetted frameworks and control libraries. Current release remains tenant-internal only.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
