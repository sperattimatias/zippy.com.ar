'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { can } from '../../lib/admin-rbac';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type MeResponse = {
  email?: string;
  roles?: string[];
};

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  permission?: 'audit.view' | 'settings.edit';
};

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path} />
    </svg>
  );
}

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Operations',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: <Icon path="M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-8h8V3h-8v10z" /> },
      { href: '/admin/trips', label: 'Trips', icon: <Icon path="M5 16h14l-1-5H6l-1 5zm2 0v2m10-2v2M7 11l1-4h8l1 4M3 16h18" /> },
      { href: '/admin/drivers', label: 'Drivers', icon: <Icon path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /> },
      { href: '/admin/users', label: 'Users', icon: <Icon path="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M8 7a4 4 0 1 0 0-8" /> },
      { href: '/admin/support/tickets', label: 'Support', icon: <Icon path="M22 12a10 10 0 1 1-4-8v8zM8 12h8M8 16h5" /> },
    ],
  },
  {
    title: 'Risk',
    items: [
      { href: '/admin/fraud', label: 'Fraud', icon: <Icon path="M12 3l8 4v5c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V7l8-4z" /> },
      { href: '/admin/kyc/drivers', label: 'KYC Drivers', icon: <Icon path="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" /> },
      { href: '/admin/audit', label: 'Audit', icon: <Icon path="M8 2h8l4 4v16H4V2h4zm0 0v4h8" />, permission: 'audit.view' },
      { href: '/admin/notifications/settings', label: 'Notif Settings', icon: <Icon path="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m2 0a3 3 0 0 0 6 0" /> },
    ],
  },
  {
    title: 'Business',
    items: [
      { href: '/admin/payments', label: 'Payments', icon: <Icon path="M3 7h18v10H3zM3 11h18M7 15h3" /> },
      { href: '/admin/incentives', label: 'Incentives', icon: <Icon path="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16l-4.9 2.2.9-5.5-4-3.9 5.5-.8L12 3z" /> },
      { href: '/admin/zones', label: 'Zones', icon: <Icon path="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zM9 3v15m6-12v15" /> },
      { href: '/admin/reports/overview', label: 'Reports', icon: <Icon path="M4 20h16M7 16V8m5 8V4m5 12v-6" /> },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/admin/settings/pricing', label: 'Pricing', icon: <Icon path="M12 1v3m0 16v3m11-11h-3M4 12H1m19.8 7.8-2.1-2.1M5.3 5.3 3.2 3.2m15.6 0-2.1 2.1M5.3 18.7l-2.1 2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />, permission: 'settings.edit' },
      { href: '/admin/settings/integrations', label: 'Integrations', icon: <Icon path="M7 7h10v10H7zM3 12h4m10 0h4m-9-9v4m0 10v4" />, permission: 'settings.edit' },
      { href: '/admin/notifications/templates', label: 'Templates', icon: <Icon path="M4 6h16v12H4zM4 8l8 5 8-5" /> },
    ],
  },
];

function toTitle(pathname: string) {
  const chunks = pathname.split('/').filter(Boolean).slice(1);
  if (!chunks.length) return 'Dashboard';
  return chunks[chunks.length - 1].replace('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export function AdminShell({ children, topbarActions }: { children: ReactNode; topbarActions?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse>({});

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return;
        setMe(await res.json());
      })
      .catch(() => undefined);
  }, []);

  const roleLabel = useMemo(() => (me.roles && me.roles.length > 0 ? me.roles.join(', ') : 'admin'), [me.roles]);
  const crumbs = useMemo(() => pathname.split('/').filter(Boolean), [pathname]);

  const onLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex w-full max-w-[1680px]">
          <aside className="hidden min-h-screen w-72 border-r border-slate-800 bg-slate-900/40 px-3 py-5 lg:block">
            <div className="px-2 pb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Operations Console</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">Zippy Admin</h1>
            </div>

            <Separator />

            <div className="mt-4 space-y-5">
              {navGroups.map((group) => (
                <section key={group.title} className="space-y-1.5">
                  <p className="px-2 text-xs font-medium uppercase tracking-wide text-slate-500">{group.title}</p>
                  <nav className="space-y-1">
                    {group.items
                      .filter((item) => !item.permission || can(me.roles, item.permission))
                      .map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                          <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                              <Link href={item.href}>
                                <Button
                                  variant={isActive ? 'default' : 'ghost'}
                                  className={cn('h-9 w-full justify-start gap-2.5 rounded-md px-2.5 text-sm', !isActive && 'text-slate-300 hover:text-white')}
                                >
                                  <span className="text-slate-300">{item.icon}</span>
                                  <span>{item.label}</span>
                                </Button>
                              </Link>
                            </TooltipTrigger>
                          </Tooltip>
                        );
                      })}
                  </nav>
                </section>
              ))}
            </div>
          </aside>

          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur md:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                    {crumbs.map((crumb, idx) => (
                      <span key={`${crumb}-${idx}`} className="flex items-center gap-1">
                        <span>{crumb}</span>
                        {idx < crumbs.length - 1 ? <span>/</span> : null}
                      </span>
                    ))}
                  </div>
                  <h2 className="truncate text-xl font-semibold tracking-tight">{toTitle(pathname)}</h2>
                </div>

                <div className="flex items-center gap-2">
                  {topbarActions}
                  <Badge variant="secondary" className="hidden md:inline-flex">{roleLabel}</Badge>
                  <details className="relative">
                    <summary className="list-none">
                      <Button variant="secondary" size="sm" type="button">{me.email ?? 'Usuario'}</Button>
                    </summary>
                    <div className="absolute right-0 z-50 mt-2 min-w-[11rem] rounded-md border border-slate-700 bg-slate-900 p-1 shadow-lg">
                      <button className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-slate-800" onClick={() => router.push('/admin/dashboard')}>
                        Dashboard
                      </button>
                      <button className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-slate-800" onClick={() => void onLogout()}>
                        Logout
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </header>

            <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
