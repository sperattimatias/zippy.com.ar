'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { can } from '../../lib/admin-rbac';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

type MeResponse = {
  email?: string;
  roles?: string[];
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
  permission?: 'audit.view' | 'settings.edit';
};

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Operations',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: '◻' },
      { href: '/admin/trips', label: 'Trips', icon: '🚕' },
      { href: '/admin/drivers', label: 'Drivers', icon: '🪪' },
      { href: '/admin/users', label: 'Users', icon: '👤' },
      { href: '/admin/support/tickets', label: 'Support', icon: '🎫' },
    ],
  },
  {
    title: 'Risk',
    items: [
      { href: '/admin/fraud', label: 'Fraud', icon: '🛡' },
      { href: '/admin/kyc/drivers', label: 'KYC Drivers', icon: '📋' },
      { href: '/admin/audit', label: 'Audit', icon: '🧾', permission: 'audit.view' },
      { href: '/admin/notifications/settings', label: 'Notif Settings', icon: '🔔' },
    ],
  },
  {
    title: 'Business',
    items: [
      { href: '/admin/payments', label: 'Payments', icon: '💳' },
      { href: '/admin/incentives', label: 'Incentives', icon: '🎯' },
      { href: '/admin/zones', label: 'Zones', icon: '🗺' },
      { href: '/admin/reports/overview', label: 'Reports', icon: '📈' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/admin/settings/pricing', label: 'Pricing', icon: '⚙', permission: 'settings.edit' },
      { href: '/admin/settings/integrations', label: 'Integrations', icon: '🔌', permission: 'settings.edit' },
      { href: '/admin/notifications/templates', label: 'Templates', icon: '✉' },
    ],
  },
];

function toTitle(pathname: string) {
  const chunks = pathname.split('/').filter(Boolean).slice(1);
  if (!chunks.length) return 'Dashboard';
  return chunks[chunks.length - 1].replace('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export function AdminShell({ children }: { children: ReactNode }) {
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
  const crumbs = useMemo(() => pathname.split('/').filter(Boolean).slice(1), [pathname]);

  const onLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden min-h-screen w-72 border-r border-slate-800 bg-slate-900/50 p-4 lg:block">
          <h1 className="mb-6 text-xl font-semibold">Zippy Admin</h1>
          <div className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="px-2 text-xs uppercase tracking-wide text-slate-500">{group.title}</p>
                <nav className="space-y-1">
                  {group.items
                    .filter((item) => !item.permission || can(me.roles, item.permission))
                    .map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition',
                            isActive ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                          )}
                        >
                          <span>{item.icon}</span>
                          {item.label}
                        </Link>
                      );
                    })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="mb-1 text-xs text-slate-500">{crumbs.join(' / ') || 'admin'}</p>
                <h2 className="text-lg font-semibold">{toTitle(pathname)}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-slate-400 md:block">{roleLabel}</span>
                <details className="relative">
                  <summary className="list-none">
                    <Button variant="secondary" size="sm" type="button">
                      {me.email ?? 'Usuario'}
                    </Button>
                  </summary>
                  <div className="absolute right-0 z-50 mt-2 min-w-[10rem] rounded-md border border-slate-700 bg-slate-900 p-1">
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
  );
}
