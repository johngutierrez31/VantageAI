import { PrismaClient } from '@prisma/client';
import { seedDemoWorkspace } from '../prisma/demo-seed';

const prisma = new PrismaClient();

async function main() {
  const result = await seedDemoWorkspace(prisma);
  console.log(
    `[demo-reset] ready: tenant=${result.tenantSlug} (${result.tenantId}) user=${result.userEmail}`
  );
}

main()
  .catch((error) => {
    console.error('[demo-reset] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
