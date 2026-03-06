import { PrismaClient } from '@prisma/client';
import { seedDemoWorkspace } from './demo-seed';

const prisma = new PrismaClient();

seedDemoWorkspace(prisma)
  .then((result) => {
    console.log(
      `[seed] seeded deterministic demo workspace: tenant=${result.tenantSlug} user=${result.userEmail}`
    );
  })
  .catch((error) => {
    console.error('[seed] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
