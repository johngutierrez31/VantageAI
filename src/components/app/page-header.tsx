import Link from 'next/link';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
};

type Props = {
  title: string;
  description?: string;
  primaryAction?: Action;
  secondaryActions?: Action[];
  children?: ReactNode;
};

function renderAction(action: Action, index: number, isPrimary = false) {
  if (action.href) {
    return (
      <Button key={`${action.label}-${index}`} asChild variant={action.variant ?? (isPrimary ? 'default' : 'outline')}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }

  return (
    <Button
      key={`${action.label}-${index}`}
      onClick={action.onClick}
      variant={action.variant ?? (isPrimary ? 'default' : 'outline')}
      type="button"
    >
      {action.label}
    </Button>
  );
}

export function PageHeader({ title, description, primaryAction, secondaryActions = [], children }: Props) {
  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
          {children}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {secondaryActions.map((action, index) => renderAction(action, index))}
          {primaryAction ? renderAction(primaryAction, 0, true) : null}
        </div>
      </div>
    </div>
  );
}
