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
  volumeLabel?: string;
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

export function PageHeader({
  title,
  description,
  primaryAction,
  secondaryActions = [],
  volumeLabel = 'Volume I',
  children
}: Props) {
  const showDropCap = (description?.length ?? 0) > 90;

  return (
    <div className="ornate-frame mb-8 rounded-md border border-border bg-card/95 p-6 shadow-panel md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="academia-volume">{volumeLabel}</p>
          <h1 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">{title}</h1>
          {description ? (
            <p
              className={`max-w-3xl text-base text-muted-foreground ${showDropCap ? 'academia-drop-cap' : 'italic'}`}
            >
              {description}
            </p>
          ) : null}
          {children}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {secondaryActions.map((action, index) => renderAction(action, index))}
          {primaryAction ? renderAction(primaryAction, 0, true) : null}
        </div>
      </div>
      <div aria-hidden="true" className="ornate-divider mt-6" />
    </div>
  );
}
