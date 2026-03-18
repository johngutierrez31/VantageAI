import { Card, CardContent } from '@/components/ui/card';
import type { ContextualHelpContent } from '@/lib/product/contextual-help';

export function ContextualHelpPanel({ help }: { help: ContextualHelpContent }) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer list-none">
        <Card className="border-primary/20 bg-background/80 shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Quick Guide</p>
              <p className="mt-1 text-sm text-muted-foreground">{help.summary}</p>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Expand</p>
          </CardContent>
        </Card>
      </summary>
      <Card className="mt-3 border-border/80 bg-background/70 shadow-none">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            {help.sections.map((section) => (
              <div key={section.title} className="rounded-md border border-border bg-card/60 p-3">
                <p className="text-sm font-semibold text-foreground">{section.title}</p>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {section.items.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {help.note ? <p className="text-xs text-muted-foreground">{help.note}</p> : null}
        </CardContent>
      </Card>
    </details>
  );
}
