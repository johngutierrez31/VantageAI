import { Card, CardContent } from '@/components/ui/card';
import type { ContextualHelpContent } from '@/lib/product/contextual-help';

export function ContextualHelpPanel({ help }: { help: ContextualHelpContent }) {
  return (
    <Card className="mt-4 border-primary/20 bg-background/80 shadow-none">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            How To Use This Page
          </p>
          <p className="text-sm text-muted-foreground">{help.summary}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {help.sections.map((section) => (
            <div key={section.title} className="rounded-md border border-border bg-card/60 p-3">
              <p className="text-sm font-semibold text-foreground">{section.title}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {help.note ? <p className="text-xs text-muted-foreground">{help.note}</p> : null}
      </CardContent>
    </Card>
  );
}
