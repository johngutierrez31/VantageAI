'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { TrialStatus, WorkspaceMode } from '@prisma/client';
import { signOut } from 'next-auth/react';
import {
  Bell,
  Bot,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  Flame,
  Menu,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatPlanLabel, type CommercialPlanTier } from '@/lib/product/module-catalog';
import { formatWorkspaceModeLabel } from '@/lib/workspace-mode';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type SearchItem = {
  id: string;
  label: string;
  description?: string;
  href: string;
  kind:
    | 'command'
    | 'copilot'
    | 'analyst'
    | 'adoption'
    | 'tools'
    | 'policy'
    | 'range'
    | 'runbook'
    | 'settings'
    | 'trustops'
    | 'pulse'
    | 'ai'
    | 'vendor'
    | 'questionnaire'
    | 'review'
    | 'library'
    | 'evidencemap'
    | 'risk'
    | 'roadmap'
    | 'brief'
    | 'quarterly'
    | 'responseops'
    | 'incident'
    | 'tabletop';
};

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  href?: string;
};

type Props = {
  tenantId: string;
  tenantName: string;
  memberships: Array<{
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    role: string;
  }>;
  role: string;
  demoMode: boolean;
  userLabel: string;
  searchItems: SearchItem[];
  notifications: NotificationItem[];
  currentPlan: CommercialPlanTier;
  workspaceMode: WorkspaceMode;
  trialStatus: TrialStatus;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  children: ReactNode;
};

const SALES_SITE_URL = 'https://vantageciso.com';
const GUIDED_TOUR_STORAGE_KEY = 'vantage-guided-tour-dismissed';

const navItems: NavItem[] = [
  { href: '/app/command-center', label: 'Command Center', icon: ShieldCheck },
  { href: '/app/adoption', label: 'Adoption Mode', icon: Sparkles },
  { href: '/app/pulse', label: 'Pulse', icon: TrendingUp },
  { href: '/app/ai-governance', label: 'AI Governance', icon: Bot },
  { href: '/app/response-ops', label: 'Response Ops', icon: Flame },
  { href: '/app/trust', label: 'TrustOps', icon: ClipboardList },
  { href: '/app/questionnaires', label: 'Questionnaires', icon: FileText },
  { href: '/app/tools', label: 'Tools Hub', icon: Menu },
  { href: '/app/copilot', label: 'Copilot', icon: Bot },
  { href: '/app/security-analyst', label: 'Security Analyst', icon: ShieldCheck },
  { href: '/app/cyber-range', label: 'Cyber Range', icon: Radar },
  { href: '/app/runbooks', label: 'Runbooks', icon: FileText },
  { href: '/app/policies', label: 'Policies', icon: FileText },
  { href: '/app/settings/members', label: 'Settings', icon: Settings }
];

const tourStops = [
  {
    href: '/app/tools',
    label: 'Demo Story',
    note: 'Start with the guided workflow map so the commercial story is clear before you drill into records.',
    artifact: 'Guided entry'
  },
  {
    href: '/app/trust/inbox',
    label: 'TrustOps',
    note: 'Open the buyer diligence request, linked questionnaire, and evidence map.',
    artifact: 'Buyer diligence workflow'
  },
  {
    href: '/app/pulse',
    label: 'Pulse',
    note: 'Show the executive scorecard, top risks, roadmap, and board-ready summary.',
    artifact: 'Executive scorecard'
  },
  {
    href: '/app/ai-governance',
    label: 'AI Governance',
    note: 'Review one higher-risk AI use case and the approval conditions attached to it.',
    artifact: 'AI risk decision'
  },
  {
    href: '/app/response-ops',
    label: 'Response Ops',
    note: 'Finish with a live incident and the follow-up work that carries back into leadership review.',
    artifact: 'Incident carry-over'
  }
] as const;

function formatRouteLabel(pathname: string) {
  const navMatch = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (navMatch) return navMatch.label;

  const leaf = pathname
    .split('/')
    .filter(Boolean)
    .pop();

  if (!leaf) return 'Workspace';

  return leaf
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function SearchDialog({
  open,
  onClose,
  items
}: {
  open: boolean;
  onClose: () => void;
  items: SearchItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 12);
    const needle = query.toLowerCase();
    return items
      .filter(
        (item) =>
          item.label.toLowerCase().includes(needle) ||
          item.description?.toLowerCase().includes(needle) ||
          item.kind.includes(needle)
      )
      .slice(0, 20);
  }, [items, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-3 pt-4 backdrop-blur-sm sm:p-4 sm:pt-16">
      <Card className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden sm:max-h-[calc(100dvh-4rem)]">
        <CardHeader className="border-b border-border p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Search the workspace by module, deliverable, queue, or executive output.
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 p-4 sm:p-5">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workflows, reports, and settings"
          />
          <div className="flex-1 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                No matching workflows or deliverables found.
              </p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full flex-col items-start gap-2 rounded-md border border-transparent px-3 py-3 text-left hover:border-border hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-2 py-1 uppercase tracking-wide">{item.kind}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose} type="button" className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GuidedTourCard({
  demoMode,
  onClose
}: {
  demoMode: boolean;
  onClose: () => void;
}) {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-muted/30">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {demoMode ? <Badge variant="warning">Demo Workspace</Badge> : null}
            <Badge variant="muted">Demo Story</Badge>
          </div>
          <CardTitle className="mt-3">See the product story in under five minutes</CardTitle>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Follow one coherent path from buyer diligence to executive visibility, governed AI review, and incident carry-over.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Dismiss
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 xl:grid-cols-5">
          {tourStops.map((stop, index) => (
            <div key={stop.href} className="rounded-md border border-border bg-background/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{stop.artifact}</span>
              </div>
              <p className="mt-3 text-sm font-semibold">{stop.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stop.note}</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={stop.href}>Open Step</Link>
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/app/tools">Start Demo Story</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/app/pulse">See Sample Deliverables</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <a href={SALES_SITE_URL} target="_blank" rel="noreferrer">
              Request Walkthrough <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AppShell({
  tenantId,
  tenantName,
  memberships,
  role,
  demoMode,
  userLabel,
  searchItems,
  notifications,
  currentPlan,
  workspaceMode,
  trialStatus,
  trialEndsAt,
  trialDaysRemaining,
  children
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const routeLabel = formatRouteLabel(pathname);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState(tenantId);
  const [switchBusy, setSwitchBusy] = useState(false);
  const [showTour, setShowTour] = useState(true);

  useEffect(() => {
    setCurrentTenantId(tenantId);
  }, [tenantId]);

  useEffect(() => {
    if (!demoMode) {
      setShowTour(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(GUIDED_TOUR_STORAGE_KEY) === 'true';
    setShowTour(!dismissed);
  }, [demoMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setShowNotifications(false);
    setShowUserMenu(false);
    setShowMobileNav(false);
  }, [pathname]);

  async function switchTenant(nextTenantId: string) {
    if (!nextTenantId || nextTenantId === currentTenantId) return;

    setSwitchBusy(true);
    const response = await fetch('/api/session/tenant', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: nextTenantId })
    });
    setSwitchBusy(false);

    if (!response.ok) return;
    setCurrentTenantId(nextTenantId);
    setShowMobileNav(false);
    router.refresh();
  }

  function dismissTour() {
    setShowTour(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(GUIDED_TOUR_STORAGE_KEY, 'true');
    }
  }

  function reopenTour() {
    if (!demoMode) return;
    setShowTour(true);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(GUIDED_TOUR_STORAGE_KEY);
    }
  }

  const planBadgeLabel = demoMode ? 'Demo Access' : formatPlanLabel(currentPlan);
  const canAccessSettings = role === 'ADMIN' || role === 'OWNER';
  const visibleNavItems = navItems.filter((item) => {
    const isSettingsItem = item.href.startsWith('/app/settings');
    if (demoMode && isSettingsItem) return false;
    if (!canAccessSettings && isSettingsItem) return false;
    return true;
  });
  const mobileQuickNavItems = visibleNavItems.slice(0, 6);
  const workspaceSummary = demoMode
    ? 'Synthetic identities and example data only. Premium workflows and export paths stay enabled so the evaluation story stays complete.'
    : workspaceMode === 'TRIAL'
      ? `Blank full-access trial workspace${trialDaysRemaining !== null ? ` with ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} remaining` : ''}.`
      : 'Tenant-scoped security operations workspace for trust, posture, AI risk, and incident workflows.';

  const mobileWorkspaceSummary = demoMode
    ? 'Example data only, with premium workflows and exports enabled for evaluation.'
    : workspaceMode === 'TRIAL'
      ? `Full-access trial workspace${trialDaysRemaining !== null ? ` with ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} remaining` : ''}.`
      : 'Tenant-scoped workspace with live role-based access.';

  return (
    <div className="academia-shell min-h-screen bg-background text-foreground">
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} items={searchItems} />
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/80 bg-card/80 p-4 lg:block">
          <div className="mb-6 space-y-4">
            <div className="ornate-frame rounded-md border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {demoMode ? (
                  <Badge variant="warning">Demo Workspace</Badge>
                ) : workspaceMode === 'TRIAL' ? (
                  <Badge variant="default">14-Day Trial</Badge>
                ) : (
                  <Badge variant="muted">{formatWorkspaceModeLabel(workspaceMode)} Workspace</Badge>
                )}
                <Badge variant="muted">{planBadgeLabel}</Badge>
              </div>
              <p className="mt-3 font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                {demoMode ? 'Sample Tenant' : workspaceMode === 'TRIAL' ? 'Trial Workspace' : 'Active Tenant'}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{tenantName}</p>
              <p className="mt-2 text-sm text-muted-foreground">{workspaceSummary}</p>
              {workspaceMode === 'TRIAL' && trialEndsAt ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Trial ends {new Date(trialEndsAt).toLocaleDateString()} ({trialStatus.toLowerCase()}).
                </p>
              ) : null}
              <div className="mt-4 space-y-2">
                <Select
                  value={currentTenantId}
                  onChange={(event) => switchTenant(event.target.value)}
                  disabled={switchBusy || memberships.length < 2}
                  className="h-10 bg-card"
                >
                  {memberships.map((membership) => (
                    <option key={membership.tenantId} value={membership.tenantId}>
                      {membership.tenantName}
                    </option>
                  ))}
                </Select>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{role}</span>
                  <span>{memberships.length > 1 ? 'Switch workspace' : 'Single workspace'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-background/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Golden Path</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {demoMode
                  ? 'Lead with buyer diligence, then Pulse, AI Governance, and Response Ops.'
                  : workspaceMode === 'TRIAL'
                    ? 'Start with a real workflow in TrustOps or Pulse, then expand into AI Governance and Response Ops as records accumulate.'
                    : 'Move from current operational pressure into the module that owns the durable record.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {demoMode ? (
                  <>
                    <Button size="sm" variant="outline" type="button" onClick={reopenTour}>
                      Demo Story
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a href={SALES_SITE_URL} target="_blank" rel="noreferrer">
                        Request Walkthrough
                      </a>
                    </Button>
                  </>
                ) : workspaceMode === 'TRIAL' ? (
                  <>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/app/command-center">Start Here</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/app/tools">Open Tools Hub</Link>
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-300 ease-out',
                    active
                      ? 'bg-primary/18 text-foreground ring-1 ring-primary/40'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-3 py-3 backdrop-blur sm:px-4 md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-2 lg:w-full lg:max-w-2xl lg:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mt-0.5 shrink-0 lg:hidden"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowUserMenu(false);
                    setShowMobileNav((value) => !value);
                  }}
                  aria-expanded={showMobileNav}
                  aria-controls="mobile-navigation-panel"
                >
                  {showMobileNav ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="lg:hidden">
                    <p className="truncate text-sm font-semibold text-foreground">{routeLabel}</p>
                    <p className="truncate font-display text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {tenantName}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="hidden w-full items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-left text-sm text-muted-foreground transition-colors duration-300 ease-out hover:border-primary/40 hover:bg-muted/50 hover:text-foreground lg:flex"
                    onClick={() => setSearchOpen(true)}
                  >
                    <Search className="h-4 w-4" />
                    <span className="flex-1 truncate">Search modules, queues, sample deliverables, and settings</span>
                    <span className="rounded bg-card px-2 py-0.5 font-display text-xs text-muted-foreground">
                      Cmd+K / Ctrl+K
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch lg:self-auto">
                {demoMode ? (
                  <Button type="button" size="sm" variant="outline" className="flex-1 px-3 sm:flex-none" onClick={reopenTour}>
                    Demo Story
                  </Button>
                ) : null}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowNotifications((value) => !value);
                    }}
                    type="button"
                    aria-expanded={showNotifications}
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  {notifications.length ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-warning" /> : null}
                  {showNotifications ? (
                    <Card className="fixed inset-x-3 top-[4.75rem] z-40 mt-0 max-h-[calc(100dvh-6rem)] w-auto overflow-y-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:max-h-[420px] sm:w-80">
                      <CardContent className="space-y-2 p-3">
                        {notifications.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No urgent alerts right now.</p>
                        ) : (
                          notifications.map((notice) => (
                            <Link
                              key={notice.id}
                              href={notice.href ?? '#'}
                              className="block rounded-md border border-border p-2 hover:bg-muted/40"
                            >
                              <p className="text-sm font-medium">{notice.title}</p>
                              <p className="text-xs text-muted-foreground">{notice.detail}</p>
                            </Link>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNotifications(false);
                      setShowUserMenu((value) => !value);
                    }}
                    type="button"
                    className="px-3"
                    aria-expanded={showUserMenu}
                  >
                    <User className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">{role}</span>
                    <span className="sm:hidden">Profile</span>
                  </Button>
                  {showUserMenu ? (
                    <Card className="fixed inset-x-3 top-[4.75rem] z-40 mt-0 w-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-72">
                      <CardContent className="space-y-2 p-3">
                        <p className="text-sm font-medium">{userLabel}</p>
                        <p className="text-xs text-muted-foreground">{tenantName}</p>
                        <p className="text-xs text-muted-foreground">
                          {demoMode ? 'Access: Demo-unlocked evaluation workspace' : `Plan: ${formatPlanLabel(currentPlan)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{workspaceSummary}</p>
                        {workspaceMode === 'TRIAL' && trialEndsAt ? (
                          <p className="text-xs text-muted-foreground">Trial ends {new Date(trialEndsAt).toLocaleDateString()}.</p>
                        ) : null}
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <Link href="/app/account">Open My Workspace</Link>
                        </Button>
                        {!demoMode ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => signOut({ callbackUrl: '/login' })}
                          >
                            Sign out
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-3 text-left text-sm text-muted-foreground transition-colors duration-300 ease-out hover:border-primary/40 hover:bg-muted/50 hover:text-foreground lg:hidden"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">Search workflows and deliverables</span>
              </button>
            </div>
          </header>

          {showMobileNav ? (
            <div
              id="mobile-navigation-panel"
              className="border-b border-border bg-gradient-to-b from-card via-card/95 to-background/90 px-3 pb-4 pt-3 lg:hidden"
            >
              <div className="space-y-4">
                <div className="ornate-frame overflow-hidden rounded-md border border-border bg-muted/20">
                  <div className="border-b border-border/70 bg-muted/30 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {demoMode ? (
                        <Badge variant="warning">Demo Workspace</Badge>
                      ) : workspaceMode === 'TRIAL' ? (
                        <Badge variant="default">14-Day Trial</Badge>
                      ) : (
                        <Badge variant="muted">{formatWorkspaceModeLabel(workspaceMode)} Workspace</Badge>
                      )}
                      <Badge variant="muted">{planBadgeLabel}</Badge>
                    </div>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium text-foreground">{routeLabel}</p>
                        <p className="truncate text-xs text-muted-foreground">{tenantName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    <Select
                      value={currentTenantId}
                      onChange={(event) => switchTenant(event.target.value)}
                      disabled={switchBusy || memberships.length < 2}
                      className="h-11 bg-card"
                    >
                      {memberships.map((membership) => (
                        <option key={membership.tenantId} value={membership.tenantId}>
                          {membership.tenantName}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted-foreground">{mobileWorkspaceSummary}</p>
                    {workspaceMode === 'TRIAL' && trialEndsAt ? (
                      <p className="text-xs text-muted-foreground">Trial ends {new Date(trialEndsAt).toLocaleDateString()}.</p>
                    ) : null}
                    {demoMode ? (
                      <Button type="button" size="sm" className="w-full" variant="outline" onClick={reopenTour}>
                        Open Demo Story
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Quick Access
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {mobileQuickNavItems.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setShowMobileNav(false)}
                          className={cn(
                            'rounded-md border px-3 py-3 transition-colors duration-300 ease-out',
                            active
                              ? 'border-primary/50 bg-primary/15 text-foreground'
                              : 'border-border bg-card/70 text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    All Modules
                  </p>
                  <nav className="grid gap-2">
                    {visibleNavItems.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setShowMobileNav(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-md border px-3 py-3 text-sm transition-colors duration-300 ease-out',
                            active
                              ? 'border-primary/50 bg-primary/18 text-foreground ring-1 ring-primary/40'
                              : 'border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-primary'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </div>
            </div>
          ) : null}

          <div aria-hidden="true" className="ornate-divider mx-4 md:mx-6 lg:mx-8" />

          <main className="flex-1 space-y-4 px-3 py-4 sm:px-4 sm:py-5 md:px-6 lg:px-8">
            {demoMode ? (
              <Card className="border-warning/40 bg-warning/10">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Demo Workspace (Read-only)</p>
                  <p className="mt-1">
                    This environment contains fictional, sanitized sample data for product evaluation. Create, edit, and admin actions are disabled.
                  </p>
                </CardContent>
              </Card>
            ) : null}
            {demoMode && showTour ? <GuidedTourCard demoMode={demoMode} onClose={dismissTour} /> : null}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
