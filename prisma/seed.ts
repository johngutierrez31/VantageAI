import { PrismaClient, TemplateStatus, TenantRole } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_TENANT_ID = 'tenant_demo';
const DEMO_USER_ID = 'user_demo_admin';

async function resetTemplateByName(tenantId: string, name: string) {
  const existing = await prisma.template.findFirst({ where: { tenantId, name } });
  if (existing) {
    await prisma.template.delete({ where: { id: existing.id } });
  }
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: { name: 'Demo Tenant' },
    create: { id: DEMO_TENANT_ID, slug: 'demo-tenant', name: 'Demo Tenant' }
  });

  const user = await prisma.user.upsert({
    where: { email: 'admin@vantageciso.local' },
    update: { name: 'Demo Admin' },
    create: { id: DEMO_USER_ID, email: 'admin@vantageciso.local', name: 'Demo Admin' }
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: { role: TenantRole.ADMIN },
    create: { tenantId: tenant.id, userId: user.id, role: TenantRole.ADMIN }
  });

  const templates = [
    {
      name: 'Security Readiness (V1)',
      description: 'Baseline security readiness template inspired by SOC2-style categories.',
      domains: [
        {
          domain: 'Governance',
          code: 'SEC-GOV-1',
          title: 'Security policy governance',
          questions: ['Do you maintain approved security policies?', 'Are policy owners assigned and reviewed quarterly?']
        },
        {
          domain: 'Access',
          code: 'SEC-ACC-1',
          title: 'Identity and access controls',
          questions: ['Is MFA enforced for privileged accounts?', 'Are access reviews performed at least quarterly?']
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
          questions: ['Is there an AI risk committee?', 'Are AI use-cases classified by impact tier?']
        },
        {
          domain: 'Secure Build',
          code: 'AI-SEC-1',
          title: 'LLM security and abuse controls',
          questions: ['Do prompts/outputs undergo safety filtering?', 'Are model/data lineage records retained?']
        }
      ]
    }
  ];

  for (const item of templates) {
    await resetTemplateByName(tenant.id, item.name);

    const template = await prisma.template.create({
      data: {
        tenantId: tenant.id,
        name: item.name,
        description: item.description,
        status: TemplateStatus.PUBLISHED,
        createdBy: user.id
      }
    });

    const version = await prisma.templateVersion.create({
      data: {
        tenantId: tenant.id,
        templateId: template.id,
        version: 1,
        title: `${item.name} - V1`,
        notes: 'Seeded template',
        isPublished: true
      }
    });

    await prisma.template.update({ where: { id: template.id }, data: { currentVersionId: version.id } });

    for (const control of item.domains) {
      const createdControl = await prisma.control.create({
        data: {
          tenantId: tenant.id,
          templateVersionId: version.id,
          domain: control.domain,
          code: control.code,
          title: control.title,
          weight: 1
        }
      });

      for (const prompt of control.questions) {
        await prisma.question.create({
          data: {
            tenantId: tenant.id,
            controlId: createdControl.id,
            prompt,
            rubric: '0=Not implemented, 1=Ad hoc, 2=Defined, 3=Managed, 4=Optimized',
            weight: 1
          }
        });
      }
    }
  }
}

main().finally(async () => prisma.$disconnect());
