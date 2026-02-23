import { prisma } from '@/lib/db/prisma';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { AssessmentCreateForm } from '@/components/assessment-create-form';

export default async function NewAssessmentPage() {
  const session = await getPageSessionContext();
  const templates = await prisma.template.findMany({ where: { tenantId: session.tenantId }, select: { id: true, name: true } });

  return (
    <div>
      <div className="card">
        <h2>Create Assessment</h2>
        <p>Choose a template, name the assessment, and set the customer organization.</p>
      </div>
      <AssessmentCreateForm templates={templates} />
    </div>
  );
}
