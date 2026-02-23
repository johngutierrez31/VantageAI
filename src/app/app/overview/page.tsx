import Link from 'next/link';
import { addDays, subDays } from 'date-fns';
import { BarChart3, FileUp, PlusCircle, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { KpiCard } from '@/components/app/kpi-card';
import { EmptyState } from '@/components/app/empty-state';
import { Sparkline } from '@/components/app/sparkline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { buildTrendSeries, computeScoreFromResponses } from '@/lib/assessment/metrics';

export default async function OverviewPage() {
  const session = await getPageSessionContext();
  const now = new Date();
  const soon = addDays(now, 30);
  const ninetyDaysAgo = subDays(now, 90);

  const [assessments, expiringExceptions, staleEvidenceCount, totalEvidence, openTasks] = await Promise.all([
    prisma.assessment.findMany({
      where: { tenantId: session.tenantId },
      include: {
        template: true,
        responses: {
          include: {
            question: {
              include: {
                control: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 14
    }),
    prisma.exception.findMany({
      where: {
        tenantId: session.tenantId,
        dueDate: {
          gte: now,
          lte: soon
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 6
    }),
    prisma.evidence.count({
      where: {
        tenantId: session.tenantId,
        createdAt: { lt: ninetyDaysAgo }
      }
    }),
    prisma.evidence.count({
      where: { tenantId: session.tenantId }
    }),
    prisma.task.findMany({
      where: {
        tenantId: session.tenantId,
        status: { not: 'DONE' }
      },
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      take: 6
    })
  ]);

  const scoredAssessments = assessments.map((assessment) => {
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
      createdAt: assessment.createdAt,
      score
    };
  });

  const latestSecurity = scoredAssessments.find((item) => item.templateName.toLowerCase().includes('security'));
  const latestAi = scoredAssessments.find((item) => item.templateName.toLowerCase().includes('ai'));
  const trend = buildTrendSeries(scoredAssessments.map((item) => ({ createdAt: item.createdAt, overall: item.score.overall })));

  const topGaps = scoredAssessments
    .flatMap((assessment) =>
      assessment.score.gaps.map((gap) => ({
        ...gap,
        assessmentId: assessment.id,
        assessmentName: assessment.name
      }))
    )
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Monitor readiness outcomes, prioritized risk, and execution health across your security program."
        primaryAction={{ label: 'Create Assessment', href: '/app/assessments/new' }}
        secondaryActions={[
          { label: 'Import Questionnaire', href: '/app/questionnaires', variant: 'outline' },
          { label: 'Upload Evidence', href: '/app/evidence', variant: 'outline' }
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <KpiCard
          label="Security Readiness"
          value={latestSecurity ? `${latestSecurity.score.overall}/4` : 'N/A'}
          hint={latestSecurity ? `Latest: ${latestSecurity.name}` : 'Run a security assessment to populate'}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <KpiCard
          label="AI Readiness"
          value={latestAi ? `${latestAi.score.overall}/4` : 'N/A'}
          hint={latestAi ? `Latest: ${latestAi.name}` : 'Run an AI readiness assessment to populate'}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <KpiCard
          label="Evidence Freshness"
          value={`${staleEvidenceCount}`}
          hint={`${totalEvidence} total evidence items`}
          trend={staleEvidenceCount > 0 ? 'Refresh needed for stale evidence' : 'No stale evidence older than 90 days'}
          icon={<FileUp className="h-5 w-5" />}
        />
        <KpiCard
          label="Expiring Exceptions"
          value={`${expiringExceptions.length}`}
          hint="Exceptions expiring in next 30 days"
          icon={<PlusCircle className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reassessment Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <Sparkline data={trend.slice(-10)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Gaps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scored gaps yet. Complete an assessment to see priorities.</p>
            ) : (
              topGaps.map((gap, index) => (
                <div key={`${gap.assessmentId}-${gap.controlCode}-${index}`} className="rounded-md border border-border p-3">
                  <p className="text-sm font-semibold">
                    {gap.controlCode} - {gap.domain}
                  </p>
                  <p className="text-xs text-muted-foreground">Assessment: {gap.assessmentName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{gap.recommendation}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Exception Expirations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {expiringExceptions.length === 0 ? (
            <EmptyState
              title="No exceptions expiring soon"
              description="Accepted risks with expiry dates will show here so teams can review before deadlines."
            />
          ) : (
            expiringExceptions.map((exception) => (
              <div key={exception.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-semibold">{exception.controlCode}</p>
                  <p className="text-xs text-muted-foreground">{exception.reason}</p>
                </div>
                <p className="text-xs text-muted-foreground">{exception.dueDate?.toISOString().slice(0, 10)}</p>
              </div>
            ))
          )}
          <div className="pt-2">
            <Button asChild variant="outline">
              <Link href="/app/findings">Manage Findings & Exceptions</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gaps to Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {openTasks.length === 0 ? (
            <EmptyState
              title="No open remediation tasks"
              description="Create tasks from control gaps to track owners, due dates, and execution status."
            />
          ) : (
            openTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-semibold">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.controlCode ? `Control ${task.controlCode} - ` : ''}
                    {task.assignee ? `Assignee: ${task.assignee}` : 'Unassigned'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{task.priority}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                  </p>
                </div>
              </div>
            ))
          )}
          <div className="pt-2">
            <Button asChild variant="outline">
              <Link href="/app/findings">Open Findings Workbench</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
