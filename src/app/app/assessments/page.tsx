import { prisma } from '@/lib/db/prisma';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { AssessmentsTable } from '@/components/app/assessments-table';
import { computeScoreFromResponses } from '@/lib/assessment/metrics';

export default async function AssessmentsPage() {
  const session = await getPageSessionContext();
  const assessments = await prisma.assessment.findMany({
    where: { tenantId: session.tenantId },
    include: {
      template: true,
      responses: {
        include: {
          question: {
            include: { control: true }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  const ownerIds = Array.from(new Set(assessments.map((assessment) => assessment.createdBy)));
  const owners = await prisma.user.findMany({
    where: { id: { in: ownerIds } },
    select: { id: true, email: true, name: true }
  });
  const ownerById = new Map(owners.map((owner) => [owner.id, owner.name || owner.email]));

  const rows = assessments.map((assessment) => {
    const questions = assessment.responses.map((response) => ({
      id: response.questionId,
      prompt: response.question.prompt,
      weight: response.question.weight,
      control: {
        code: response.question.control.code,
        domain: response.question.control.domain
      }
    }));
    const responses = assessment.responses.map((response) => ({
      questionId: response.questionId,
      score: response.score,
      confidence: response.confidence,
      answer: response.answer
    }));
    const score = computeScoreFromResponses(questions, responses);

    return {
      id: assessment.id,
      name: assessment.name,
      templateName: assessment.template.name,
      status: assessment.status,
      overall: score.overall,
      confidence: score.confidence,
      updatedAt: assessment.updatedAt.toISOString(),
      owner: ownerById.get(assessment.createdBy) ?? 'Unassigned',
      customerName: assessment.customerName
    };
  });

  return <AssessmentsTable rows={rows} />;
}
