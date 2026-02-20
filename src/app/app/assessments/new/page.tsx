import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';
import { AssessmentCreateForm } from '@/components/assessment-create-form';

export default async function NewAssessmentPage() {
  const session = await getSessionContext();
  const templates = await prisma.template.findMany({ where: { tenantId: session.tenantId }, select: { id: true, name: true } });

  return <AssessmentCreateForm templates={templates} />;
}
