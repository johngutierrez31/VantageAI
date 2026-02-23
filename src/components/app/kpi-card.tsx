import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  label: string;
  value: string;
  hint?: string;
  trend?: string;
  icon?: ReactNode;
};

export function KpiCard({ label, value, hint, trend, icon }: Props) {
  return (
    <Card className="bg-gradient-to-b from-card to-background/70">
      <CardHeader className="pb-1">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="flex items-center justify-between text-3xl">
          <span>{value}</span>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {trend ? <p className="text-sm text-success">{trend}</p> : null}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
