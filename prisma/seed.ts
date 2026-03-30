import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBaseline() {
  const tenantCount = await prisma.tenant.count();
  const templateCount = await prisma.template.count();

  console.log(
    `[seed] baseline seed complete (safe mode): tenants=${tenantCount} templates=${templateCount}`
  );
  console.log(
    '[seed] no demo data inserted. Use `npm run prisma:seed:demo` or `npm run demo:reset` for demo workspace data.'
  );
}

seedBaseline()
  .catch((error) => {
    console.error('[seed] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
