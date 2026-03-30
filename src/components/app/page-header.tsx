import Link from 'next/link';
import { ReactNode } from 'react';
import { ContextualHelpPanel } from '@/components/app/contextual-help-panel';
import { Button } from '@/components/ui/button';
import { getContextualHelp, type ContextualHelpKey } from '@/lib/product/contextual-help';

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
  helpKey?: ContextualHelpKey;
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
  volumeLabel,
  helpKey,
  children
}: Props) {
  const showDropCap = (description?.length ?? 0) > 90;
  const contextualHelp = helpKey ? getContextualHelp(helpKey) : null;

  return (
    <div className="ornate-frame mb-8 rounded-md border border-border bg-card/95 p-6 shadow-panel md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {volumeLabel ? <p className="academia-volume">{volumeLabel}</p> : null}
          <h1 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">{title}</h1>
          {description ? (
            <p
              className={`max-w-3xl text-base text-muted-foreground ${showDropCap ? 'academia-drop-cap' : 'italic'}`}
            >
              {description}
            </p>
          ) : null}
          {children}
          {contextualHelp ? <ContextualHelpPanel help={contextualHelp} /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primaryAction ? (
            <>
              {renderAction(primaryAction, 0, true)}
              {secondaryActions.length > 0 && (
                <span aria-hidden="true" className="hidden h-5 w-px bg-border lg:inline-block" />
              )}
            </>
          ) : null}
          {secondaryActions.map((action, index) => renderAction(action, index))}
        </div>
      </div>
      <div aria-hidden="true" className="ornate-divider mt-6" />
    </div>
  );
}
