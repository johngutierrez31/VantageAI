import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { prisma } from '@/lib/db/prisma';

export default async function AppRootPage() {
  const session = await getPageSessionContext();
  const [memberCount, templateCount, evidenceCount, assessmentCount, trustInboxCount] = await Promise.all([
    prisma.membership.count({ where: { tenantId: session.tenantId, status: 'ACTIVE' } }),
    prisma.template.count({ where: { tenantId: session.tenantId } }),
    prisma.evidence.count({ where: { tenantId: session.tenantId } }),
    prisma.assessment.count({ where: { tenantId: session.tenantId } }),
    prisma.trustInboxItem.count({ where: { tenantId: session.tenantId } })
  ]);

  const steps = [
    {
      id: 'members',
      label: 'Invite members',
      done: memberCount > 1,
      href: '/app/settings/members'
    },
    {
      id: 'templates',
      label: 'Choose or create template',
      done: templateCount > 0,
      href: '/app/templates'
    },
    {
      id: 'evidence',
      label: 'Upload evidence',
      done: evidenceCount > 0,
      href: '/app/evidence'
    },
    {
      id: 'assessment',
      label: 'Run first assessment',
      done: assessmentCount > 0,
      href: '/app/assessments/new'
    },
    {
      id: 'trust',
      label: 'Open trust inbox',
      done: trustInboxCount > 0,
      href: '/app/trust/inbox'
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="VantageCISO Console"
        description="Assess, execute, prove, and respond from one tenant-contained cybersecurity workspace."
        primaryAction={{ label: 'Go to Overview', href: '/app/overview' }}
        secondaryActions={[
          { label: 'Trust Packet', href: '/app/trust', variant: 'outline' },
          { label: 'Copilot', href: '/app/copilot', variant: 'outline' }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Onboarding Wizard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <p className="text-sm">{step.label}</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={step.href}>{step.done ? 'Review' : 'Start'}</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
