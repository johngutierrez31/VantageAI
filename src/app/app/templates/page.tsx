import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { getSessionContext } from '@/lib/auth/session';

export default async function TemplatesPage() {
  const session = await getSessionContext();
  const templates = await prisma.template.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Templates</h2>
        <Link href="/app/templates/new">Create Template</Link>
      </div>
      {templates.map((t) => (
        <Link key={t.id} href={`/app/templates/${t.id}`} className="card" style={{ display: 'block' }}>
          <h3>{t.name}</h3>
          <p>Status: {t.status}</p>
        </Link>
      ))}
    </div>
  );
}
