'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type MeResponse = {
  email?: string;
  roles?: string[];
};

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/drivers', label: 'Drivers' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/fraud', label: 'Fraud' },
  { href: '/admin/zones', label: 'Zones' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/support/tickets', label: 'Support · Tickets' },
  { href: '/admin/settings/integrations', label: 'Settings · Integrations' },
];

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

  const onLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900/60 p-4 md:block">
        <h1 className="mb-6 text-xl font-bold">Zippy Admin</h1>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/40 px-4 py-3 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Admin panel</p>
            <p className="text-sm font-medium text-slate-200">{me.email ?? 'Usuario'}</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-xs text-slate-400">Rol: {roleLabel}</p>
            <button className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
