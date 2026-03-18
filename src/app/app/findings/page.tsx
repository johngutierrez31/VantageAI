import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { computeScoreFromResponses } from '@/lib/assessment/metrics';
import { EmptyState } from '@/components/app/empty-state';
import { FindingsWorkbench } from '@/components/app/findings-workbench';
import { listTenantReviewers } from '@/lib/trust/reviewers';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export default async function FindingsPage() {
  const session = await getPageSessionContext();
  const [workspace, tasks, exceptions, assessments, findings, reviewers] = await Promise.all([
    getTenantWorkspaceContext(session.tenantId),
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
    }),
    prisma.finding.findMany({
      where: { tenantId: session.tenantId },
      include: {
        questionnaireUpload: {
          select: {
            id: true,
            filename: true,
            organizationName: true
          }
        },
        evidenceMap: {
          select: {
            id: true,
            name: true
          }
        },
        aiUseCase: {
          select: {
            id: true,
            name: true
          }
        },
        aiVendorReview: {
          select: {
            id: true,
            vendorName: true,
            productName: true
          }
        },
        incident: {
          select: {
            id: true,
            title: true
          }
        },
        tabletopExercise: {
          select: {
            id: true,
            title: true
          }
        },
        task: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
      take: 120
    }),
    listTenantReviewers(session.tenantId)
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
    <div className="space-y-6">
      {workspace.isTrial &&
      tasks.length === 0 &&
      exceptions.length === 0 &&
      assessments.length === 0 &&
      findings.length === 0 &&
      topGaps.length === 0 ? (
        <EmptyState
          title="Findings will appear as trust, AI, and response work accumulates"
          description="This workspace is still clean. Findings becomes useful after you import a questionnaire, register an AI workflow, run an incident, or capture assessment gaps that need owned follow-up."
          actionLabel="Start with Questionnaires"
          actionHref="/app/questionnaires"
          eyebrow="Findings / Gaps"
          supportingPoints={[
            'What it is for: track gaps, exceptions, and remediation work.',
            'First action: create work in TrustOps, AI Governance, or Response Ops.',
            'Output: owned findings and tasks with status, priority, and carry-over into Pulse.'
          ]}
        />
      ) : null}

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
        trustFindings={findings.map((finding) => ({
          id: finding.id,
          title: finding.title,
          description: finding.description,
          sourceType: finding.sourceType,
          status: finding.status,
          priority: finding.priority,
          supportStrength: finding.supportStrength,
          controlCode: finding.controlCode,
          ownerUserId: finding.ownerUserId,
          questionnaireUpload: finding.questionnaireUpload
            ? {
                id: finding.questionnaireUpload.id,
                label: finding.questionnaireUpload.organizationName ?? finding.questionnaireUpload.filename
              }
            : null,
          evidenceMap: finding.evidenceMap
            ? {
                id: finding.evidenceMap.id,
                name: finding.evidenceMap.name
              }
            : null,
          aiUseCase: finding.aiUseCase
            ? {
                id: finding.aiUseCase.id,
                name: finding.aiUseCase.name
              }
            : null,
          aiVendorReview: finding.aiVendorReview
            ? {
                id: finding.aiVendorReview.id,
                label: `${finding.aiVendorReview.vendorName} - ${finding.aiVendorReview.productName}`
              }
            : null,
          incident: finding.incident
            ? {
                id: finding.incident.id,
                title: finding.incident.title
              }
            : null,
          tabletopExercise: finding.tabletopExercise
            ? {
                id: finding.tabletopExercise.id,
                title: finding.tabletopExercise.title
              }
            : null,
          task: finding.task
            ? {
                id: finding.task.id,
                title: finding.task.title
              }
            : null,
          updatedAt: finding.updatedAt.toISOString()
        }))}
        reviewers={reviewers.map((reviewer) => ({
          id: reviewer.userId,
          label: reviewer.user.name ?? reviewer.user.email
        }))}
        topGaps={topGaps.slice(0, 10)}
      />
    </div>
  );
}
