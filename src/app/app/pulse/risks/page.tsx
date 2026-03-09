import { getPageSessionContext } from '@/lib/auth/page-session';
import { listRiskRegisterItems } from '@/lib/pulse/risk-register';
import { listTenantReviewers } from '@/lib/trust/reviewers';
import { RiskRegisterPanel } from '@/components/app/risk-register-panel';

export default async function PulseRisksPage() {
  const session = await getPageSessionContext();
  const [risks, reviewers] = await Promise.all([
    listRiskRegisterItems(session.tenantId),
    listTenantReviewers(session.tenantId)
  ]);

  return (
    <RiskRegisterPanel
      risks={risks.map((risk) => ({
        ...risk,
        targetDueAt: risk.targetDueAt?.toISOString() ?? null,
        updatedAt: risk.updatedAt.toISOString(),
        reviewNotes: risk.reviewNotes ?? null
      }))}
      reviewers={reviewers.map((reviewer) => ({
        id: reviewer.userId,
        label: reviewer.user.name ?? reviewer.user.email
      }))}
    />
  );
}
