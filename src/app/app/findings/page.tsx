import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { computeScoreFromResponses } from '@/lib/assessment/metrics';
import { FindingsWorkbench } from '@/components/app/findings-workbench';

export default async function FindingsPage() {
  const session = await getPageSessionContext();
  const [tasks, exceptions, assessments] = await Promise.all([
    prisma.task.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }],
      take: 80
    }),
    prisma.exception.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      take: 80
    }),
    prisma.assessment.findMany({
      where: { tenantId: session.tenantId },
      include: {
        responses: {
          include: {
            question: {
              include: { control: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 6
    })
  ]);

  const topGaps = assessments.flatMap((assessment) => {
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
    return score.gaps.map((gap) => ({
      assessmentName: assessment.name,
      controlCode: gap.controlCode,
      domain: gap.domain,
      score: gap.score,
      recommendation: gap.recommendation
    }));
  });

  return (
    <FindingsWorkbench
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        controlCode: task.controlCode,
        assignee: task.assignee,
        dueDate: task.dueDate?.toISOString() ?? null,
        status: task.status,
        priority: task.priority
      }))}
      exceptions={exceptions.map((exception) => ({
        id: exception.id,
        controlCode: exception.controlCode,
        reason: exception.reason,
        owner: exception.owner,
        approver: exception.approver,
        dueDate: exception.dueDate?.toISOString() ?? null,
        status: exception.status
      }))}
      topGaps={topGaps.slice(0, 10)}
    />
  );
}
