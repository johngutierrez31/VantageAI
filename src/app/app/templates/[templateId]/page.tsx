import { prisma } from '@/lib/db/prisma';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { TemplateActions } from '@/components/template-actions';
import { PageHeader } from '@/components/app/page-header';
import { StatusPill } from '@/components/app/status-pill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function TemplateDetailPage({ params }: { params: { templateId: string } }) {
  const session = await getPageSessionContext();
  const template = await prisma.template.findFirst({
    where: { id: params.templateId, tenantId: session.tenantId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        include: { controls: { include: { questions: true } } }
      }
    }
  });

  if (!template) return <div className="card">Template not found.</div>;
  const latestVersion = template.versions[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={template.name}
        description={template.description ?? 'Template definition and version history.'}
      >
        <div className="flex items-center gap-2">
          <StatusPill status={template.status} />
          <span className="text-xs text-muted-foreground">
            Latest version: {latestVersion?.version ?? 'N/A'}
          </span>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Template Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateActions templateId={template.id} status={template.status} />
        </CardContent>
      </Card>

      {template.versions.map((version) => (
        <Card key={version.id}>
          <CardHeader>
            <CardTitle>
              Version {version.version} {version.isPublished ? '(Published)' : '(Draft)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Questions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {version.controls.map((control) => (
                  <TableRow key={control.id}>
                    <TableCell>
                      <p className="font-medium">
                        {control.code} - {control.title}
                      </p>
                    </TableCell>
                    <TableCell>{control.domain}</TableCell>
                    <TableCell>{control.weight}</TableCell>
                    <TableCell>
                      <ul className="list-disc space-y-1 pl-5">
                        {control.questions.map((question) => (
                          <li key={question.id} className="text-sm text-muted-foreground">
                            {question.prompt}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
