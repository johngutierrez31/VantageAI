import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { buildControlCoverage, computeScoreFromResponses } from '@/lib/assessment/metrics';
import { AssessmentWorkspace } from '@/components/app/assessment-workspace';

type Props = {
  params: { assessmentId: string };
  searchParams?: { tab?: string };
};

export default async function AssessmentDetailPage({ params, searchParams }: Props) {
  const session = await getPageSessionContext();
  const assessment = await prisma.assessment.findFirst({
    where: { id: params.assessmentId, tenantId: session.tenantId },
    include: {
      template: true,
      responses: {
        include: {
          question: { include: { control: true } },
          evidenceLinks: true
        }
      }
    }
  });
  if (!assessment) return <div className="card">Assessment not found.</div>;

  const questions = await prisma.question.findMany({
    where: {
      tenantId: session.tenantId,
      control: { templateVersionId: assessment.templateVersionId }
    },
    include: { control: true },
    orderBy: [{ control: { domain: 'asc' } }, { control: { code: 'asc' } }]
  });

  const taskAndExceptionData = await Promise.all([
    prisma.task.findMany({
      where: { tenantId: session.tenantId, assessmentId: assessment.id },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }]
    }),
    prisma.exception.findMany({
      where: { tenantId: session.tenantId, assessmentId: assessment.id },
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }]
    }),
    prisma.evidenceRequest.findMany({
      where: { tenantId: session.tenantId, assessmentId: assessment.id },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }]
    })
  ]);

  const [tasks, exceptions, evidenceRequests] = taskAndExceptionData;

  const questionInputs = questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    weight: question.weight,
    control: {
      domain: question.control.domain,
      code: question.control.code,
      title: question.control.title,
      weight: question.control.weight
    }
  }));

  const responseInputs = assessment.responses.map((response) => ({
    questionId: response.questionId,
    score: response.score,
    confidence: response.confidence,
    answer: response.answer,
    evidenceLinks: response.evidenceLinks.map((link) => ({ evidenceId: link.evidenceId }))
  }));

  const score = computeScoreFromResponses(questionInputs, responseInputs);
  const controls = buildControlCoverage(questionInputs, responseInputs);

  let scoreDelta: number | null = null;
  const previousAssessment = await prisma.assessment.findFirst({
    where: {
      tenantId: session.tenantId,
      customerName: assessment.customerName,
      id: { not: assessment.id }
    },
    include: {
      responses: {
        include: {
          question: {
            include: { control: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (previousAssessment) {
    const previousQuestions = previousAssessment.responses.map((response) => ({
      id: response.questionId,
      prompt: response.question.prompt,
      weight: response.question.weight,
      control: {
        domain: response.question.control.domain,
        code: response.question.control.code
      }
    }));
    const previousResponses = previousAssessment.responses.map((response) => ({
      questionId: response.questionId,
      score: response.score,
      confidence: response.confidence,
      answer: response.answer
    }));
    const previousScore = computeScoreFromResponses(previousQuestions, previousResponses);
    scoreDelta = Number((score.overall - previousScore.overall).toFixed(2));
  }

  return (
    <AssessmentWorkspace
      assessment={{
        id: assessment.id,
        name: assessment.name,
        customerName: assessment.customerName,
        status: assessment.status,
        templateName: assessment.template.name,
        updatedAt: assessment.updatedAt.toISOString()
      }}
      score={score}
      scoreDelta={scoreDelta}
      controls={controls}
      questions={questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        weight: question.weight,
        control: {
          domain: question.control.domain,
          code: question.control.code
        }
      }))}
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
        assessmentId: exception.assessmentId,
        controlCode: exception.controlCode,
        reason: exception.reason,
        owner: exception.owner,
        approver: exception.approver,
        dueDate: exception.dueDate?.toISOString() ?? null,
        status: exception.status
      }))}
      evidenceRequests={evidenceRequests.map((request) => ({
        id: request.id,
        assessmentId: request.assessmentId,
        title: request.title,
        details: request.details,
        assignee: request.assignee,
        status: request.status,
        dueDate: request.dueDate?.toISOString() ?? null
      }))}
      initialTab={searchParams?.tab}
    />
  );
}
