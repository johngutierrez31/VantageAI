import Link from 'next/link';
import { ArrowRight, Bot, ClipboardList, ShieldCheck, TrendingUp } from 'lucide-react';
import { isDemoModeEnabled } from '@/lib/auth/demo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const demoMode = isDemoModeEnabled();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,169,98,0.14),transparent_34%),linear-gradient(180deg,rgba(11,15,23,0.96),rgba(20,24,34,0.98))] px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center gap-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">VantageAI Workspace</Badge>
              {demoMode ? <Badge variant="warning">Demo Sandbox</Badge> : <Badge variant="muted">Authenticated App</Badge>}
            </div>
            <div className="space-y-4">
              <p className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Security Operating System
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
                Turn buyer diligence, AI risk, and executive reporting into one credible workspace.
              </h1>
              <p className="max-w-3xl text-lg text-muted-foreground">
                VantageAI helps lean security teams move from intake to evidence, governance decisions, board-safe summaries, and owned follow-up without exposing internal scaffolding.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={demoMode ? '/app/command-center' : '/login'}>
                  {demoMode ? 'Open Demo Workspace' : 'Start 14-Day Trial'} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="https://vantageciso.com" target="_blank" rel="noreferrer">
                  Request Walkthrough
                </a>
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-border bg-card/60 p-4">
                <p className="text-sm font-semibold">Buyer diligence</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Import questionnaires, build evidence maps, and package trust materials.
                </p>
              </div>
              <div className="rounded-md border border-border bg-card/60 p-4">
                <p className="text-sm font-semibold">AI governance</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review higher-risk use cases, vendors, policy fit, and approval conditions.
                </p>
              </div>
              <div className="rounded-md border border-border bg-card/60 p-4">
                <p className="text-sm font-semibold">Executive posture</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Translate live work into scorecards, roadmaps, and board-ready summaries.
                </p>
              </div>
            </div>
          </div>

          <Card className="border-primary/30 bg-card/95">
            <CardHeader>
              <CardTitle>What a strong workspace shows immediately</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  title: 'Command Center',
                  description: 'Cross-module priorities, trust pressure, AI issues, and current actions.',
                  icon: <ShieldCheck className="h-5 w-5" />
                },
                {
                  title: 'TrustOps',
                  description: 'Example buyer request, reviewed answers, evidence map, and trust packet.',
                  icon: <ClipboardList className="h-5 w-5" />
                },
                {
                  title: 'Pulse',
                  description: 'Executive scorecard, trendline, top risks, and remediation roadmap.',
                  icon: <TrendingUp className="h-5 w-5" />
                },
                {
                  title: 'AI Governance',
                  description: 'A realistic AI risk review with conditions, ownership, and policy links.',
                  icon: <Bot className="h-5 w-5" />
                }
              ].map((item) => (
                <div key={item.title} className="rounded-md border border-border bg-background/50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="text-primary">{item.icon}</div>
                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
              {demoMode ? (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-muted-foreground">
                  This environment is a demo sandbox with synthetic identities and example records only.
                </div>
              ) : (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
                  Trial workspaces start blank, include full suite access for 14 days, and do not reuse the seeded demo tenant.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
