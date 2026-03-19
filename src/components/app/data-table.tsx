import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DataTableProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  wrapperClassName?: string;
  wrapperId?: string;
  children: ReactNode;
};

export function DataTable({ title, description, actions, wrapperClassName, wrapperId, children }: DataTableProps) {
  return (
    <Card id={wrapperId} className={wrapperClassName}>
      {(title || description || actions) ? (
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </CardHeader>
      ) : null}
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
