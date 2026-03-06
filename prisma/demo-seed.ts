import {
  MembershipStatus,
  PlanTier,
  PrismaClient,
  TemplateStatus,
  TenantRole
} from '@prisma/client';

export const DEMO_TENANT_ID = 'tenant_demo';
export const DEMO_TENANT_SLUG = 'demo-tenant';
export const DEMO_TENANT_NAME = 'Demo Tenant';
export const DEMO_USER_ID = 'user_demo_admin';
export const DEMO_USER_EMAIL = 'admin@vantageciso.local';
export const DEMO_USER_NAME = 'Demo Admin';
const DEMO_EMAIL_VERIFIED_AT = new Date('2026-01-01T00:00:00.000Z');

type SeedTemplate = {
  name: string;
  description: string;
  domains: Array<{
    domain: string;
    code: string;
    title: string;
    questions: string[];
  }>;
};

const seedTemplates: SeedTemplate[] = [
  {
    name: 'Security Readiness (V1)',
    description: 'Baseline security readiness template inspired by SOC 2-style categories.',
    domains: [
      {
        domain: 'Governance',
        code: 'SEC-GOV-1',
        title: 'Security policy governance',
        questions: [
          'Do you maintain approved security policies?',
          'Are policy owners assigned and reviewed quarterly?'
        ]
      },
      {
        domain: 'Access',
        code: 'SEC-ACC-1',
        title: 'Identity and access controls',
        questions: [
          'Is MFA enforced for privileged accounts?',
          'Are access reviews performed at least quarterly?'
        ]
      }
    ]
  },
  {
    name: 'AI Readiness (V1)',
    description: 'AI readiness template drawing from NIST AI RMF and ISO 42001 concepts.',
    domains: [
      {
        domain: 'Govern',
        code: 'AI-GOV-1',
        title: 'AI governance and ownership',
        questions: [
          'Is there an AI risk committee?',
          'Are AI use-cases classified by impact tier?'
        ]
      },
      {
        domain: 'Secure Build',
        code: 'AI-SEC-1',
        title: 'LLM security and abuse controls',
        questions: [
          'Do prompts and outputs undergo safety filtering?',
          'Are model and data lineage records retained?'
        ]
      }
    ]
  }
];

async function resetTenantScopedData(prisma: PrismaClient, tenantId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.verificationToken.deleteMany({
      where: { identifier: DEMO_USER_EMAIL }
    });

    await tx.reportExport.deleteMany({ where: { tenantId } });
    await tx.trustInboxAttachment.deleteMany({ where: { tenantId } });
    await tx.trustInboxItem.deleteMany({ where: { tenantId } });
    await tx.draftAnswer.deleteMany({ where: { tenantId } });
    await tx.questionnaireMapping.deleteMany({ where: { tenantId } });
    await tx.questionnaireItem.deleteMany({ where: { tenantId } });
    await tx.questionnaireUpload.deleteMany({ where: { tenantId } });
    await tx.questionnaireImportRow.deleteMany({ where: { tenantId } });
    await tx.questionnaireImport.deleteMany({ where: { tenantId } });
    await tx.evidenceLink.deleteMany({ where: { tenantId } });
    await tx.trustDoc.deleteMany({ where: { tenantId } });
    await tx.evidenceChunk.deleteMany({ where: { tenantId } });
    await tx.evidenceRequest.deleteMany({ where: { tenantId } });
    await tx.task.deleteMany({ where: { tenantId } });
    await tx.exception.deleteMany({ where: { tenantId } });
    await tx.report.deleteMany({ where: { tenantId } });
    await tx.response.deleteMany({ where: { tenantId } });
    await tx.assessment.deleteMany({ where: { tenantId } });
    await tx.aISuggestion.deleteMany({ where: { tenantId } });
    await tx.auditLog.deleteMany({ where: { tenantId } });
    await tx.billingWebhookEvent.deleteMany({ where: { tenantId } });
    await tx.stripeCustomer.deleteMany({ where: { tenantId } });
    await tx.subscription.deleteMany({ where: { tenantId } });
    await tx.evidence.deleteMany({ where: { tenantId } });
    await tx.template.deleteMany({ where: { tenantId } });
  });
}

async function seedTemplatesForTenant(prisma: PrismaClient, tenantId: string, userId: string) {
  for (const templateDef of seedTemplates) {
    const template = await prisma.template.create({
      data: {
        tenantId,
        name: templateDef.name,
        description: templateDef.description,
        status: TemplateStatus.PUBLISHED,
        createdBy: userId
      }
    });

    const version = await prisma.templateVersion.create({
      data: {
        tenantId,
        templateId: template.id,
        version: 1,
        title: `${templateDef.name} - V1`,
        notes: 'Seeded template',
        isPublished: true
      }
    });

    await prisma.template.update({
      where: { id: template.id },
      data: { currentVersionId: version.id }
    });

    for (const controlDef of templateDef.domains) {
      const control = await prisma.control.create({
        data: {
          tenantId,
          templateVersionId: version.id,
          domain: controlDef.domain,
          code: controlDef.code,
          title: controlDef.title,
          weight: 1
        }
      });

      for (const prompt of controlDef.questions) {
        await prisma.question.create({
          data: {
            tenantId,
            controlId: control.id,
            prompt,
            rubric: '0=Not implemented, 1=Ad hoc, 2=Defined, 3=Managed, 4=Optimized',
            weight: 1
          }
        });
      }
    }
  }
}

export async function seedDemoWorkspace(prisma: PrismaClient) {
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_TENANT_SLUG },
    update: {
      name: DEMO_TENANT_NAME,
      activeStorageProvider: 'LOCAL',
      activeVectorProvider: 'HASHED',
      activeEmailProvider: 'RESEND'
    },
    create: {
      id: DEMO_TENANT_ID,
      slug: DEMO_TENANT_SLUG,
      name: DEMO_TENANT_NAME,
      activeStorageProvider: 'LOCAL',
      activeVectorProvider: 'HASHED',
      activeEmailProvider: 'RESEND'
    }
  });

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {
      name: DEMO_USER_NAME,
      emailVerified: DEMO_EMAIL_VERIFIED_AT
    },
    create: {
      id: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      name: DEMO_USER_NAME,
      emailVerified: DEMO_EMAIL_VERIFIED_AT
    }
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: {
      role: TenantRole.ADMIN,
      status: MembershipStatus.ACTIVE
    },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: TenantRole.ADMIN,
      status: MembershipStatus.ACTIVE
    }
  });

  await prisma.account.deleteMany({ where: { userId: user.id } });
  await prisma.session.deleteMany({ where: { userId: user.id } });

  await resetTenantScopedData(prisma, tenant.id);

  await prisma.tenantBranding.upsert({
    where: { tenantId: tenant.id },
    update: {
      companyName: 'VantageAI Demo',
      primaryColor: '#0f172a',
      accentColor: '#2563eb',
      footerNote: 'Not legal advice. For planning use only.'
    },
    create: {
      tenantId: tenant.id,
      companyName: 'VantageAI Demo',
      primaryColor: '#0f172a',
      accentColor: '#2563eb',
      footerNote: 'Not legal advice. For planning use only.'
    }
  });

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: PlanTier.STARTER,
      status: 'active'
    }
  });

  await seedTemplatesForTenant(prisma, tenant.id, user.id);

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    userId: user.id,
    userEmail: user.email
  };
}
