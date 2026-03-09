import { prisma } from '@/lib/db/prisma';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { AssessmentCreateForm } from '@/components/assessment-create-form';
import { PageHeader } from '@/components/app/page-header';

export default async function NewAssessmentPage() {
  const session = await getPageSessionContext();
  const templates = await prisma.template.findMany({ where: { tenantId: session.tenantId }, select: { id: true, name: true } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Assessment"
        helpKey="assessmentNew"
        description="Start a new assessment and baseline this customer against your selected framework template."
      />
      <AssessmentCreateForm templates={templates} />
    </div>
  );
}

