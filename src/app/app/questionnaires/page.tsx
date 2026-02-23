import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { QuestionnaireInbox } from '@/components/app/questionnaire-inbox';

export default async function QuestionnairesPage() {
  const session = await getPageSessionContext();
  const assessments = await prisma.assessment.findMany({
    where: { tenantId: session.tenantId },
    select: { id: true, name: true, customerName: true },
    orderBy: { updatedAt: 'desc' }
  });

  return <QuestionnaireInbox assessments={assessments} />;
}
