import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkillsDemoWidget } from '@/components/skills/skills-demo-widget';

const FEATURED_SOURCE_URL =
  'https://skills.sh/rysweet/amplihack/cybersecurity-analyst';

const curatedSkills = [
  {
    name: 'cybersecurity-analyst',
    description: 'Analyze incidents, vulnerabilities, and architecture risk with prioritized actions.',
    sourceUrl: 'https://skills.sh/rysweet/amplihack/cybersecurity-analyst'
  },
  {
    name: 'security-reviewer',
    description: 'Review security posture and identify code or infra findings with remediation guidance.',
    sourceUrl: 'https://skills.sh/jeffallan/claude-skills/security-reviewer'
  },
  {
    name: 'incident-response-plan',
    description: 'Generate incident response procedures and response playbooks for active events.',
    sourceUrl: 'https://skills.sh/aj-geddes/useful-ai-prompts/incident-response-plan'
  },
  {
    name: 'threat-modeling-expert',
    description: 'Run STRIDE-oriented threat modeling and risk prioritization for new systems.',
    sourceUrl: 'https://skills.sh/sickn33/antigravity-awesome-skills/threat-modeling-expert'
  }
] as const;

export const dynamic = 'force-static';

export const metadata = {
  title: 'VantageAI Skills',
  description: 'Curated security automation skills used by VantageAI workflows.'
};

export default function SkillsPage() {
  const featured = curatedSkills[0];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between">
          <p className="academia-volume">Volume I</p>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/app/copilot">App</Link>
            <Link href="/skills" aria-current="page">
              Skills
            </Link>
          </nav>
        </div>

        <section className="ornate-frame rounded-md border border-border bg-card/70 p-8">
          <p className="academia-volume">VantageAI Catalog</p>
          <h1 className="mt-3 text-4xl md:text-6xl">VantageAI Skills</h1>
          <p className="academia-drop-cap mt-6 max-w-4xl text-lg text-muted-foreground">
            Reusable workflows that keep quality consistent across design, web, deployment, and documentation.
          </p>
        </section>

        <div aria-hidden="true" className="ornate-divider my-10" />

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Featured Skill</CardTitle>
              <p className="text-sm text-muted-foreground">
                {featured?.name ?? 'cybersecurity-analyst'} from SkillsDirectory
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {featured?.description ??
                  'Analyze incidents, vulnerabilities, and architecture risk using cybersecurity frameworks with prioritized actions.'}
              </p>
              <div>
                <p className="mb-2 font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  What it helps with
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  <li>Incident triage, threat hypotheses, and containment sequencing</li>
                  <li>Threat-model and attack-surface analysis using STRIDE and ATT&CK</li>
                  <li>Compliance gap detection with prioritized remediation planning</li>
                </ul>
              </div>
              <p className="text-sm">
                <a href={FEATURED_SOURCE_URL} target="_blank" rel="noreferrer">
                  Source: SkillsDirectory
                </a>
              </p>
            </CardContent>
          </Card>

          <SkillsDemoWidget />
        </section>

        <section className="mt-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Recommended Skills</CardTitle>
              <p className="text-sm text-muted-foreground">
                Publicly curated skills that align with VantageAI security workflows.
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
