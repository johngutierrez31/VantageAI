import { PlanTier, PrismaClient } from '@prisma/client';
import {
  DEMO_TENANT_ID,
  DEMO_TENANT_NAME,
  DEMO_TENANT_SLUG,
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  ensureDemoUsers,
  resetTenantScopedData,
  seedTemplatesForTenant
} from './demo-support';
import { seedDemoSuiteStory } from './demo-suite-story';

export {
  DEMO_TENANT_ID,
  DEMO_TENANT_NAME,
  DEMO_TENANT_SLUG,
  DEMO_USER_EMAIL,
  DEMO_USER_ID
} from './demo-support';

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

  await ensureDemoUsers(prisma, tenant.id);
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
      plan: PlanTier.ENTERPRISE,
      status: 'active'
    }
  });

  await seedTemplatesForTenant(prisma, tenant.id, DEMO_USER_ID);
  await seedDemoSuiteStory(prisma, tenant.id);

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    userId: DEMO_USER_ID,
    userEmail: DEMO_USER_EMAIL
  };
}
