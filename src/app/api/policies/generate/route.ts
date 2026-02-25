import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { requireRole } from '@/lib/rbac/authorize';
import { handleRouteError, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { getPolicyTemplatesByIds } from '@/lib/policy-generator/library';
import { generatePolicyDocuments } from '@/lib/policy-generator/generate';
import { policyGenerationRequestSchema } from '@/lib/validation/policy-generator';

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');

    const payload = policyGenerationRequestSchema.parse(await request.json());
    const uniquePolicyIds = [...new Set(payload.policyIds)];
    const uniqueFormats = [...new Set(payload.formats)];
    const templates = await getPolicyTemplatesByIds(uniquePolicyIds);

    if (templates.length !== uniquePolicyIds.length) {
      const foundIds = new Set(templates.map((template) => template.id));
      const missingIds = uniquePolicyIds.filter((id) => !foundIds.has(id));
      return badRequest(`Unknown policy IDs: ${missingIds.join(', ')}`);
    }

    const generatedAt = new Date().toISOString();
    const documents = generatePolicyDocuments({
      templates,
      formats: uniqueFormats,
      organization: payload.organization,
      generatedAt,
      notes: payload.notes
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'policy_generator',
      entityId: session.tenantId,
      action: 'generate',
      metadata: {
        policyCount: templates.length,
        formats: uniqueFormats,
        companyName: payload.organization.companyName,
        industry: payload.organization.industry
      }
    });

    return NextResponse.json({
      generatedAt,
      policyCount: templates.length,
      formatCount: uniqueFormats.length,
      documents
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
