import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

type Props = {
  label: string;
  value: string;
  hint?: string;
  trend?: string;
  icon?: ReactNode;
};

export function KpiCard({ label, value, hint, trend, icon }: Props) {
  return (
    <Card className="bg-gradient-to-b from-card to-background/70" aria-label={`${label}: ${value}`}>
      <CardHeader className="pb-1">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
        <div className="flex items-center justify-between text-3xl font-medium tracking-tight">
          <span>{value}</span>
          {icon ? <span aria-hidden="true" className="text-muted-foreground">{icon}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {trend ? <p className="text-sm text-success">{trend}</p> : null}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
