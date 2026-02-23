import { prisma } from '@/lib/db/prisma';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { TemplatesGrid } from '@/components/app/templates-grid';

export default async function TemplatesPage() {
  const session = await getPageSessionContext();
  const templates = await prisma.template.findMany({
    where: { tenantId: session.tenantId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          controls: {
            include: { questions: true }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  const cards = templates.map((template) => {
    const latestVersion = template.versions[0];
    const controls = latestVersion?.controls ?? [];
    const domainCount = new Set(controls.map((control) => control.domain)).size;
    const questionCount = controls.reduce((total, control) => total + control.questions.length, 0);
    const lowerName = template.name.toLowerCase();
    const frameworkTag: 'Security' | 'AI' | 'General' = lowerName.includes('security')
      ? 'Security'
      : lowerName.includes('ai')
      ? 'AI'
      : 'General';

    return {
      id: template.id,
      name: template.name,
      status: template.status,
      updatedAt: template.updatedAt.toISOString(),
      frameworkTag,
      domainCount,
      controlCount: controls.length,
      questionCount
    };
  });

  return <TemplatesGrid templates={cards} />;
}
