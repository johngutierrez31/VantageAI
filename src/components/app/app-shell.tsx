'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { signOut } from 'next-auth/react';
import {
  Bell,
  Bot,
  ChevronRight,
  FileText,
  Flame,
  Menu,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  ClipboardList,
  TrendingUp,
  User,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatPlanLabel, type CommercialPlanTier } from '@/lib/product/module-catalog';
import {
  FUN_MODE_COOKIE,
  FUN_MODE_STORAGE_KEY,
  HIT_COUNTER_STORAGE_KEY,
  formatRetroHitCount,
  getNextFunHitCount,
  getRetroRouteLabel,
  getStoredFunHitCount,
  parseFunModePreference
} from '@/lib/ui/fun-mode';

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
  initialFunMode: boolean;
  children: ReactNode;
};

const navItems: NavItem[] = [
  { href: '/app/command-center', label: 'Command Center', icon: ShieldCheck },
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

const mobileQuickNavItems = navItems.slice(0, 6);

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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-3 pt-3 backdrop-blur-sm sm:p-4 sm:pt-16">
      <Card className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden sm:max-h-[calc(100dvh-4rem)]">
        <CardHeader className="border-b border-border p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Search modules, workflows, exports, and operations across the VantageAI suite.
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 p-4 sm:p-5">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
          />
          <div className="flex-1 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                No results found.
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
  initialFunMode,
  children
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const retroRouteLabel = getRetroRouteLabel(pathname);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState(tenantId);
  const [switchBusy, setSwitchBusy] = useState(false);
  const [funMode, setFunMode] = useState(initialFunMode);
  const [hitCount, setHitCount] = useState(1337000);

  useEffect(() => {
    setCurrentTenantId(tenantId);
  }, [tenantId]);

  useEffect(() => {
    setFunMode(initialFunMode);
  }, [initialFunMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedPreference = parseFunModePreference(window.localStorage.getItem(FUN_MODE_STORAGE_KEY));
    if (storedPreference !== null) setFunMode(storedPreference);
    setHitCount(getStoredFunHitCount(window.localStorage.getItem(HIT_COUNTER_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FUN_MODE_STORAGE_KEY, funMode ? 'true' : 'false');
    document.cookie = `${FUN_MODE_COOKIE}=${funMode ? 'true' : 'false'}; path=/; max-age=31536000; SameSite=Lax`;
    document.body.classList.toggle('fun-mode', funMode);
  }, [funMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !funMode) return;
    const nextCount = getNextFunHitCount(window.localStorage.getItem(HIT_COUNTER_STORAGE_KEY));
    window.localStorage.setItem(HIT_COUNTER_STORAGE_KEY, String(nextCount));
    setHitCount(nextCount);
  }, [funMode, pathname]);

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

  return (
    <div className={cn('academia-shell min-h-screen bg-background text-foreground', funMode && 'fun-mode')}>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} items={searchItems} />
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/80 bg-card/80 p-4 lg:block">
          <div className="mb-6">
            <p className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Workspace</p>
            <div className="ornate-frame mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <Select
                value={currentTenantId}
                onChange={(event) => switchTenant(event.target.value)}
                disabled={switchBusy || memberships.length < 2}
                className="h-9 bg-card"
              >
                {memberships.map((membership) => (
                  <option key={membership.tenantId} value={membership.tenantId}>
                    {membership.tenantName}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                {memberships.length > 1 ? 'Switch tenant workspace' : tenantName}
              </p>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{role}</span>
                <span className="rounded border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {formatPlanLabel(currentPlan)}
                </span>
              </div>
            </div>
            {funMode ? (
              <div className="retro-hits mt-3">
                Visitors Since 1995: {formatRetroHitCount(hitCount)}
              </div>
            ) : null}
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-serif transition-colors duration-300 ease-out',
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
          {funMode ? (
            <>
              <hr className="retro-hr my-4" />
              <div className="retro-window space-y-3 p-2">
                <p className="retro-rainbow text-center text-xs font-bold uppercase tracking-wide">
                  Fun Mode Online
                </p>
                <div className="retro-color-grid">
                  <span style={{ backgroundColor: '#ff0000' }} />
                  <span style={{ backgroundColor: '#00ff00' }} />
                  <span style={{ backgroundColor: '#0000ff' }} />
                  <span style={{ backgroundColor: '#ffff00' }} />
                  <span style={{ backgroundColor: '#ff00ff' }} />
                  <span style={{ backgroundColor: '#00ffff' }} />
                </div>
              </div>
            </>
          ) : null}
        </aside>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-3 py-3 backdrop-blur sm:px-4 md:px-6">
            {funMode ? (
              <div className="retro-marquee" aria-live="polite">
                <div className="retro-marquee-track">
                  <span className="retro-marquee-item text-[#ff0000]">WELCOME TO FUN MODE</span>
                  <span className="retro-marquee-item text-[#0000ff]">VANTAGEAI SECURITY CONSOLE 1997 EDITION</span>
                  <span className="retro-marquee-item text-[#00aa00]">HOT: TRUSTOPS, PULSE, AI GOVERNANCE, RESPONSE OPS</span>
                  <span className="retro-marquee-item text-[#800080]">PRESS FUN MODE TO TOGGLE RETRO EXPERIENCE</span>
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-2 lg:w-full lg:max-w-xl lg:items-center">
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
                    <p className="truncate text-sm font-semibold text-foreground">{retroRouteLabel}</p>
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
                    <span className="flex-1 truncate">Search modules, workflows, exports, and settings</span>
                    <span className="rounded bg-card px-2 py-0.5 font-display text-xs text-muted-foreground">
                      Cmd+K / Ctrl+K
                    </span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 self-stretch lg:self-auto">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 whitespace-nowrap px-2 sm:flex-none sm:px-3"
                  variant={funMode ? 'destructive' : 'secondary'}
                  onClick={() => setFunMode((value) => !value)}
                  aria-pressed={funMode}
                  aria-label={funMode ? 'Disable fun mode' : 'Enable fun mode'}
                >
                  <span className="sm:hidden">Fun: {funMode ? 'ON' : 'OFF'}</span>
                  <span className="hidden sm:inline">Fun Mode: {funMode ? 'ON' : 'OFF'}</span>
                  {funMode ? <span className="retro-badge-hot ml-2 hidden sm:inline">NEW!</span> : null}
                </Button>
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
                  {notifications.length ? (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-warning" />
                  ) : null}
                  {showNotifications ? (
                    <Card className="fixed inset-x-3 top-[4.75rem] z-40 mt-0 max-h-[calc(100dvh-6rem)] w-auto overflow-y-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:max-h-[420px] sm:w-80">
                      <CardContent className="space-y-2 p-3">
                        {notifications.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No alerts right now.</p>
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
                    <Card className="fixed inset-x-3 top-[4.75rem] z-40 mt-0 w-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-64">
                      <CardContent className="space-y-2 p-3">
                        <p className="text-sm font-medium">{userLabel}</p>
                        <p className="text-xs text-muted-foreground">{tenantName}</p>
                        <p className="text-xs text-muted-foreground">Plan: {formatPlanLabel(currentPlan)}</p>
                        <p className="text-xs text-muted-foreground">{demoMode ? 'Demo mode access' : 'Authenticated access'}</p>
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
                <span className="flex-1 truncate">Search modules, workflows, exports, and settings</span>
              </button>
            </div>
            {funMode ? (
              <>
                <div className="construction-stripe mt-3 p-2 text-center text-xs font-bold uppercase tracking-wide text-black">
                  Under Construction: Retro Mode Active
                </div>
                <div className="retro-status-bar" aria-label="Fun mode status">
                  <div className="retro-status-segment">
                    <strong>Tenant</strong> {tenantName}
                  </div>
                  <div className="retro-status-segment">
                    <strong>Module</strong> {retroRouteLabel}
                  </div>
                  <div className="retro-status-segment">
                    <strong>Alerts</strong> {notifications.length}
                  </div>
                  <div className="retro-status-segment">
                    <strong>Plan</strong> {formatPlanLabel(currentPlan)}
                  </div>
                </div>
              </>
            ) : null}
          </header>
          {showMobileNav ? (
            <div
              id="mobile-navigation-panel"
              className="border-b border-border bg-gradient-to-b from-card via-card/95 to-background/90 px-3 pb-4 pt-3 lg:hidden"
            >
              <div className="space-y-4">
                <div className="ornate-frame overflow-hidden rounded-md border border-border bg-muted/20">
                  <div className="border-b border-border/70 bg-muted/30 px-4 py-3">
                    <p className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                      Mobile Command Deck
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium text-foreground">{retroRouteLabel}</p>
                        <p className="truncate text-xs text-muted-foreground">{tenantName}</p>
                      </div>
                      <span className="rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground">
                        {formatPlanLabel(currentPlan)}
                      </span>
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
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="rounded-md border border-border bg-background/60 px-3 py-2">
                        <span className="block font-display uppercase tracking-[0.18em] text-[10px]">Role</span>
                        <span className="mt-1 block text-foreground">{role}</span>
                      </div>
                      <div className="rounded-md border border-border bg-background/60 px-3 py-2">
                        <span className="block font-display uppercase tracking-[0.18em] text-[10px]">Alerts</span>
                        <span className="mt-1 block text-foreground">{notifications.length}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      variant={funMode ? 'destructive' : 'secondary'}
                      onClick={() => setFunMode((value) => !value)}
                      aria-pressed={funMode}
                    >
                      Fun Mode: {funMode ? 'ON' : 'OFF'}
                    </Button>
                    {funMode ? <div className="retro-hits">Visitors Since 1995: {formatRetroHitCount(hitCount)}</div> : null}
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
                    {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMobileNav(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-md border px-3 py-3 text-sm font-serif transition-colors duration-300 ease-out',
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
          {funMode ? (
            <hr className="retro-hr mx-4 md:mx-6 lg:mx-8" />
          ) : (
            <div aria-hidden="true" className="ornate-divider mx-4 md:mx-6 lg:mx-8" />
          )}
          <main className="flex-1 px-3 py-4 sm:px-4 sm:py-5 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
