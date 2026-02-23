import { prisma } from '@/lib/db/prisma';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { AssessmentCreateForm } from '@/components/assessment-create-form';

export default async function NewAssessmentPage() {
  const session = await getPageSessionContext();
  const templates = await prisma.template.findMany({ where: { tenantId: session.tenantId }, select: { id: true, name: true } });

  return <AssessmentCreateForm templates={templates} />;
}
