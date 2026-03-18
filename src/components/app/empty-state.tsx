import Link from 'next/link';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
  eyebrow?: string;
  supportingPoints?: string[];
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
  eyebrow = 'Next Best Step',
  supportingPoints = []
}: Props) {
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className="flex flex-col items-start gap-3 p-8">
        {icon ? <div className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</div> : null}
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
        {supportingPoints.length ? (
          <div className="grid gap-2 md:grid-cols-3">
            {supportingPoints.map((point) => (
              <div key={point} className="rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                {point}
              </div>
            ))}
          </div>
        ) : null}
        {actionLabel && actionHref ? (
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
