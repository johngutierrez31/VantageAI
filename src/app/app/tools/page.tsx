import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPageSessionContext } from '@/lib/auth/page-session';
import { getInstalledSkills } from '@/lib/skills/catalog';

const appTools = [
  {
    id: 'copilot',
    title: 'Copilot',
    description: 'Chat assistant with evidence citations and mode-based guidance.',
    href: '/app/copilot'
  },
  {
    id: 'security-analyst',
    title: 'Security Analyst',
    description: 'Structured incident, threat, and architecture analysis workflows.',
    href: '/app/security-analyst'
  },
  {
    id: 'policy-generator',
    title: 'Policy Generator',
    description: 'Generate policy artifacts in markdown, HTML, and printable PDF.',
    href: '/app/policies'
  },
  {
    id: 'cyber-range',
    title: 'Cyber Range',
    description: 'Design simulation architecture and export operation plans.',
    href: '/app/cyber-range'
  }
] as const;

const workflowCards = [
  {
    title: 'Incident Readiness Flow',
    steps: ['Run Security Analyst triage', 'Collect artifacts in Evidence Vault', 'Generate IR policy update']
  },
  {
    title: 'Audit Readiness Flow',
    steps: ['Run compliance mode in Copilot', 'Generate policies', 'Launch assessments and capture evidence']
  },
  {
    title: 'Architecture Hardening Flow',
    steps: ['Threat-model in Copilot', 'Create Cyber Range validation plan', 'Track prioritized findings']
  }
] as const;

export default async function ToolsHubPage() {
  await getPageSessionContext();
  const installedSkills = await getInstalledSkills();
  const securitySkills = installedSkills.filter((skill) =>
    /security|cyber|incident|threat|policy|compliance/i.test(skill.name + ' ' + skill.description)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools Hub"
        description="Operate Copilot, Security Analyst, Policy Generator, and Cyber Range as one integrated workflow."
        primaryAction={{ label: 'Open Copilot', href: '/app/copilot' }}
        secondaryActions={[
          { label: 'Security Analyst', href: '/app/security-analyst', variant: 'outline' },
          { label: 'Policy Generator', href: '/app/policies', variant: 'outline' }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {appTools.map((tool) => (
          <Card key={tool.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-4 w-4" />
                {tool.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{tool.description}</p>
              <Button asChild size="sm">
                <Link href={tool.href}>Open Tool</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Integrated Workflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workflowCards.map((workflow) => (
              <div key={workflow.title} className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold">{workflow.title}</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  {workflow.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Installed Security Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {securitySkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No security skills detected.</p>
            ) : (
              securitySkills.slice(0, 12).map((skill) => (
                <div key={skill.name} className="rounded-md border border-border bg-background/60 p-3">
                  <p className="text-sm font-semibold">{skill.name}</p>
                  <p className="text-xs text-muted-foreground">{skill.description}</p>
                </div>
              ))
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/skills">Open Skills Catalog</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
