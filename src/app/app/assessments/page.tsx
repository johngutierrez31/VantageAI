import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { BillingPanel } from '@/components/billing-panel';

export default async function AssessmentsPage() {
  const session = await getPageSessionContext();
  const assessments = await prisma.assessment.findMany({ where: { tenantId: session.tenantId }, orderBy: { updatedAt: 'desc' } });

  return (
    <div>
      <BillingPanel />
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Assessments</h2>
        <Link href="/app/assessments/new">Create Assessment</Link>
      </div>
      {assessments.map((a) => (
        <Link href={`/app/assessments/${a.id}`} key={a.id} className="card" style={{ display: 'block' }}>
          <h3>{a.name}</h3>
          <p>{a.customerName}</p>
        </Link>
      ))}
    </div>
  );
}
