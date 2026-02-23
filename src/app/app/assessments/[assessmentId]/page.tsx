import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';
import { ResponseEditor } from '@/components/response-editor';
import { ScoreCard } from '@/components/score-card';
import { EvidenceVaultPanel } from '@/components/evidence-vault-panel';
import { QuestionnaireImportPanel } from '@/components/questionnaire-import-panel';
import { ReportPanel } from '@/components/report-panel';

export default async function AssessmentDetailPage({ params }: { params: { assessmentId: string } }) {
  const session = await getPageSessionContext();
  const assessment = await prisma.assessment.findFirst({ where: { id: params.assessmentId, tenantId: session.tenantId } });
  if (!assessment) return <div className="card">Assessment not found.</div>;

  const questions = await prisma.question.findMany({
    where: { tenantId: session.tenantId, control: { templateVersionId: assessment.templateVersionId } },
    include: { control: true }
  });

  return (
    <div>
      <div className="card"><h2>{assessment.name}</h2><p>{assessment.customerName}</p></div>
      <ScoreCard assessmentId={assessment.id} />
      <EvidenceVaultPanel />
      <QuestionnaireImportPanel assessmentId={assessment.id} questions={questions.map((q) => ({ id: q.id, prompt: q.prompt }))} />
      <ReportPanel assessmentId={assessment.id} />
      <ResponseEditor assessmentId={assessment.id} questions={questions.map((q) => ({ id: q.id, prompt: q.prompt, weight: q.weight, control: { domain: q.control.domain, code: q.control.code } }))} />
    </div>
  );
}
