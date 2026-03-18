import Link from 'next/link';
import { CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TrialChecklistItem } from '@/lib/trial/onboarding';

type Props = {
  trialDaysRemaining: number | null;
  trialEndsAt: string | null;
  completedCount: number;
  totalCount: number;
  items: TrialChecklistItem[];
};

export function TrialOnboardingCard({ trialDaysRemaining, trialEndsAt, completedCount, totalCount, items }: Props) {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="h-4 w-4" />
          Start Here
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border border-primary/20 bg-background/70 p-4">
          <p className="text-sm font-semibold">
            14-day full-access trial{trialDaysRemaining !== null ? ` • ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} remaining` : ''}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            This workspace starts blank on purpose. Use the checklist below to create the first durable records that make the suite valuable week to week.
          </p>
          {trialEndsAt ? <p className="mt-2 text-xs text-muted-foreground">Trial ends {new Date(trialEndsAt).toLocaleDateString()}.</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Progress: {completedCount} of {totalCount} starter workflows completed.
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-border bg-background/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{item.outputLabel}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={item.href}>{item.actionLabel}</Link>
                </Button>
                {item.completed ? <span className="text-xs text-primary">Completed</span> : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
