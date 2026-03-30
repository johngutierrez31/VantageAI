import type { PlanTier } from '@prisma/client';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import { canAccessModule, type CommercialModuleId } from '@/lib/billing/module-access';
import { getTenantWorkspaceContext } from '@/lib/workspace-mode';

export async function canTenantAccessModule(tenantId: string, moduleId: CommercialModuleId) {
  const [entitlements, workspace] = await Promise.all([
    getTenantEntitlements(tenantId),
    getTenantWorkspaceContext(tenantId)
  ]);

  return canAccessModule({
    moduleId,
    plan: entitlements.plan as PlanTier,
    workspaceMode: workspace.workspaceMode
  });
}

