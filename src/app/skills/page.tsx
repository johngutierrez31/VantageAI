import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkillsDemoWidget } from '@/components/skills/skills-demo-widget';
import { getInstalledSkills } from '@/lib/skills/catalog';

const curatedSkills = [
  {
    name: 'security-threat-model',
    description: 'Structured threat-modeling guidance for architecture and design reviews.',
    sourceUrl: 'https://skills.sh/openai/skills/security-threat-model'
  },
  {
    name: 'security-best-practices',
    description: 'Security hygiene and implementation patterns for hardening application and infrastructure workflows.',
    sourceUrl: 'https://skills.sh/openai/skills/security-best-practices'
  },
  {
    name: 'playwright',
    description: 'Browser-level E2E testing workflows and automation patterns.',
    sourceUrl: 'https://skills.sh/openai/skills/playwright'
  },
  {
    name: 'security-ownership-map',
    description: 'Define and maintain ownership accountability for security controls and response duties.',
    sourceUrl: 'https://skills.sh/openai/skills/security-ownership-map'
  }
] as const;

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'VantageAI Skills',
  description: 'Skill inventory and recommendations for the Solo CISO operating system.'
};

export default async function SkillsPage() {
  const installedSkills = await getInstalledSkills();
  const featured = curatedSkills[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between">
          <p className="academia-volume">Volume II</p>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/app/command-center">App</Link>
            <Link href="/skills" aria-current="page">
              Skills
            </Link>
          </nav>
        </div>

        <section className="ornate-frame rounded-md border border-border bg-card/70 p-8">
          <p className="academia-volume">Solo CISO Library</p>
          <h1 className="mt-3 text-4xl md:text-6xl">Skills Console</h1>
          <p className="academia-drop-cap mt-6 max-w-4xl text-lg text-muted-foreground">
            Track installed skills, discover new capabilities, and keep workflows reproducible for a one-person security function.
          </p>
        </section>

        <div aria-hidden="true" className="ornate-divider my-10" />

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Featured Skill</CardTitle>
              <p className="text-sm text-muted-foreground">
                {featured.name} from the OpenAI skills catalog
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{featured.description}</p>
              <div>
                <p className="mb-2 font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Solo-CISO use cases
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  <li>Threat-modeling new architecture decisions quickly</li>
                  <li>Mapping threats to prioritized mitigation controls</li>
                  <li>Building audit-ready risk rationale and residual risk statements</li>
                </ul>
              </div>
              <p className="text-sm">
                <a href={featured.sourceUrl} target="_blank" rel="noreferrer">
                  Source: skills.sh
                </a>
              </p>
            </CardContent>
          </Card>

          <SkillsDemoWidget />
        </section>

        <section className="mt-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Installed Skills in Workspace</CardTitle>
              <p className="text-sm text-muted-foreground">
                Loaded from local skill roots (`.agents/skills` and `.codex/skills`).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {installedSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No local skills detected yet.</p>
              ) : (
                installedSkills.map((skill) => (
                  <div key={skill.name} className="rounded-md border border-border bg-background/60 p-4">
                    <h3 className="text-xl">{skill.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{skill.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Paths: {skill.paths.join(', ')}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Recommended Add-ons</CardTitle>
              <p className="text-sm text-muted-foreground">
                High-impact skills for testing, security posture, and operational scale.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {curatedSkills.map((skill) => (
                  <div key={skill.name} className="rounded-md border border-border bg-background/60 p-4">
                    <h3 className="text-xl">{skill.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{skill.description}</p>
                    <p className="mt-2 text-xs">
                      <a href={skill.sourceUrl} target="_blank" rel="noreferrer">
                        Source
                      </a>
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

