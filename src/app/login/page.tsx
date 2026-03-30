import { LoginForm } from '@/components/login-form';
import Link from 'next/link';
import { isDemoModeEnabled } from '@/lib/auth/demo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  searchParams?: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: Props) {
  const demoMode = isDemoModeEnabled();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,169,98,0.14),transparent_34%),linear-gradient(180deg,rgba(11,15,23,0.96),rgba(20,24,34,0.98))] px-6 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">Secure Workspace Access</Badge>
            {demoMode ? <Badge variant="warning">Guided Demo Available</Badge> : null}
          </div>
          <div className="space-y-4">
            <p className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              app.vantageciso.com
            </p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Start a real workspace for buyer diligence, executive posture, AI risk, and response workflows.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Sign in securely with your workspace email and continue where your team left off across TrustOps, Pulse,
              AI Governance, and Response Ops.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-card/60 p-4 text-sm text-muted-foreground">
              Buyer requests, evidence, and approved answers stay in one durable workflow.
            </div>
            <div className="rounded-md border border-border bg-card/60 p-4 text-sm text-muted-foreground">
              Executive scorecards, roadmaps, and board summaries reflect live operating signals.
            </div>
            <div className="rounded-md border border-border bg-card/60 p-4 text-sm text-muted-foreground">
              AI adoption and incident follow-up stay review-gated, owned, and auditable.
            </div>
          </div>
          {demoMode ? (
            <Card className="border-warning/40 bg-warning/10">
              <CardHeader className="border-none pb-2">
                <CardTitle className="text-lg">Guided demo available</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                Open the sample tenant with synthetic identities and example data, or sign in to access a real tenant workspace.
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/app/tools">Start Demo Story</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          {searchParams?.error === 'NoMembership' ? (
            <Card className="border-warning/40 bg-warning/10">
              <CardContent className="p-5 text-sm text-muted-foreground">
                No active tenant membership was found for this account. Use a provisioned workspace email or contact
                your VantageCISO administrator.
              </CardContent>
            </Card>
          ) : null}
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
