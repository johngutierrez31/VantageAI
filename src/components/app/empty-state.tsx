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
};

export function EmptyState({ title, description, actionLabel, actionHref, icon }: Props) {
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className="flex flex-col items-start gap-3 p-8">
        {icon ? <div className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</div> : null}
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
        {actionLabel && actionHref ? (
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
