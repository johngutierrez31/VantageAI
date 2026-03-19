import { getPageSessionContext } from '@/lib/auth/page-session';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import { getPolicyCatalog } from '@/lib/policy-generator/library';
import { PolicyGeneratorPanel } from '@/components/app/policy-generator-panel';
import { EmptyState } from '@/components/app/empty-state';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export default async function PoliciesPage() {
  const session = await getPageSessionContext();
  const [workspace, entitlements, catalog] = await Promise.all([
    getTenantWorkspaceContext(session.tenantId),
    getTenantEntitlements(session.tenantId),
    getPolicyCatalog()
  ]);

  return (
    <div className="space-y-6">
      {workspace.isTrial ? (
        <EmptyState
          title="Create your first policy or evidence artifact"
          description="Use Policies to generate a practical first artifact for the workspace, then add supporting evidence so TrustOps and Pulse can reuse it later."
          actionLabel="Open Policy Generator"
          actionHref="/app/policies#policy-generator-form"
          eyebrow="Policies"
          supportingPoints={[
            'What it is for: reusable policy artifacts and supporting evidence.',
            'First action: generate a foundational policy pack for your organization.',
            'Output: a shareable policy artifact that can support trust and posture workflows.'
          ]}
        />
      ) : null}

      <PolicyGeneratorPanel
        canExportPdf={entitlements.limits.canExportPdf}
        isDemo={workspace.isDemo}
        templates={catalog.policies}
        categories={catalog.categories}
        frameworks={catalog.frameworks}
      />
    </div>
  );
}
