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
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Layers3,
  ListChecks,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
  kind: 'template' | 'assessment' | 'control';
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
  children: ReactNode;
};

const navItems: NavItem[] = [
  { href: '/app/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/app/assessments', label: 'Assessments', icon: ClipboardList },
  { href: '/app/templates', label: 'Templates', icon: Layers3 },
  { href: '/app/evidence', label: 'Evidence Vault', icon: FolderKanban },
  { href: '/app/questionnaires', label: 'Questionnaire Inbox', icon: ListChecks },
  { href: '/app/findings', label: 'Findings / Gaps', icon: ShieldCheck },
  { href: '/app/reports', label: 'Reports', icon: FileText },
  { href: '/app/copilot', label: 'Copilot', icon: Bot },
  { href: '/app/settings', label: 'Settings', icon: Settings }
];

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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-sm">
      <Card className="w-full max-w-2xl">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Global search: templates, assessments, controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
          />
          <div className="max-h-[360px] space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                No results found.
              </p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border border-transparent px-3 py-2 text-left hover:border-border hover:bg-muted/40"
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                >
                  <div>
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
            <Button variant="ghost" onClick={onClose} type="button">
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
  children
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState(tenantId);
  const [switchBusy, setSwitchBusy] = useState(false);

  useEffect(() => {
    setCurrentTenantId(tenantId);
  }, [tenantId]);

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
    <div className="min-h-screen bg-background text-foreground">
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} items={searchItems} />
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-card/80 p-4 lg:block">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
            <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-3">
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
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
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
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-primary/15 text-foreground ring-1 ring-primary/30'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
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
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex w-full max-w-xl items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setShowMobileNav((value) => !value)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/50"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="h-4 w-4" />
                  <span className="flex-1 truncate">Search templates, assessments, controls</span>
                  <span className="rounded bg-card px-2 py-0.5 text-xs text-muted-foreground">Cmd+K / Ctrl+K</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Button variant="ghost" size="icon" onClick={() => setShowNotifications((v) => !v)} type="button">
                    <Bell className="h-4 w-4" />
                  </Button>
                  {notifications.length ? (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-warning" />
                  ) : null}
                  {showNotifications ? (
                    <Card className="absolute right-0 mt-2 w-80">
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
                  <Button variant="outline" size="sm" onClick={() => setShowUserMenu((v) => !v)} type="button">
                    <User className="mr-1 h-4 w-4" />
                    {role}
                  </Button>
                  {showUserMenu ? (
                    <Card className="absolute right-0 mt-2 w-64">
                      <CardContent className="space-y-2 p-3">
                        <p className="text-sm font-medium">{userLabel}</p>
                        <p className="text-xs text-muted-foreground">{tenantName}</p>
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
            </div>
          </header>
          {showMobileNav ? (
            <div className="border-b border-border bg-card/90 p-3 lg:hidden">
              <div className="mb-3 space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
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
                <p className="text-xs text-muted-foreground">{role}</p>
              </div>
              <nav className="grid gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMobileNav(false)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-primary/15 text-foreground ring-1 ring-primary/30'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : null}
          <main className="flex-1 px-4 py-5 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
