import Link from 'next/link';
import { ArrowRight, Clock3, Sparkles } from 'lucide-react';
import { StatusPill } from '@/components/app/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DemoPathViewModel } from '@/lib/demo/demo-path';

export function DemoPathCard({
  demoPath,
  compact = false
}: {
  demoPath: DemoPathViewModel;
  compact?: boolean;
}) {
  const quickPath = compact ? demoPath.threeMinutePath.slice(0, 4) : demoPath.threeMinutePath;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          {demoPath.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            3-minute path
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{demoPath.subtitle}</p>
        </div>

        <div className={`grid gap-3 ${compact ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-5'}`}>
          {quickPath.map((step, index) => (
            <div key={`${step.href}-${index}`} className="rounded-md border border-border bg-background/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs font-semibold">
                  {index + 1}
                </span>
                {step.status ? <StatusPill status={step.status} /> : null}
              </div>
              <p className="mt-3 text-sm font-semibold">{step.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.note}</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={step.href}>
                  Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-md border border-border p-4">
            <p className="text-sm font-semibold">10-minute full-suite tour</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use this when you want the complete module story without hunting for records.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {demoPath.tenMinutePath.map((step, index) => (
                <Button key={`${step.href}-extended-${index}`} asChild size="sm" variant="outline">
                  <Link href={step.href}>
                    {index + 1}. {step.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border p-4">
            <p className="text-sm font-semibold">Seeded artifacts to show</p>
            <div className="mt-3 space-y-2">
              {demoPath.artifacts.map((artifact) => (
                <div key={`${artifact.href}-${artifact.label}`} className="rounded-md border border-border bg-background/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{artifact.label}</p>
                    {artifact.status ? <StatusPill status={artifact.status} /> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{artifact.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
