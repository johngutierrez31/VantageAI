import { prisma } from '@/lib/db/prisma';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { TemplateActions } from '@/components/template-actions';

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

  return (
    <div className="card">
      <h2>{template.name}</h2>
      <p>Status: {template.status}</p>
      <TemplateActions templateId={template.id} />
      {template.versions.map((v) => (
        <div key={v.id} className="card">
          <h3>
            Version {v.version} {v.isPublished ? '(Published)' : '(Draft)'}
          </h3>
          {v.controls.map((c) => (
            <div key={c.id}>
              <strong>
                {c.code} - {c.title}
              </strong>
              <ul>{c.questions.map((q) => <li key={q.id}>{q.prompt}</li>)}</ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
