'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/admin/page-header';
import { SectionCard } from '../../../components/admin/section-card';
import { LoadingSkeleton } from '../../../components/admin/states';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

type MePayload = { email: string; roles: string[] };

const quickLinks = [
  { href: '/admin/trips', label: 'Trips' },
  { href: '/admin/drivers', label: 'Drivers' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/fraud', label: 'Fraud' },
  { href: '/admin/zones', label: 'Zones' },
];

export default function DashboardPage() {
  const [me, setMe] = useState<MePayload | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setMe({ email: data.email, roles: data.roles ?? [] }))
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Centro operativo para monitorear y accionar sobre la plataforma."
        rightActions={<Badge variant="secondary">{(me?.roles ?? ['admin']).join(', ')}</Badge>}
      />

      <SectionCard title="Sesión actual" description="Información de autenticación y roles activos.">
        {!me ? (
          <LoadingSkeleton rows={2} />
        ) : (
          <div className="space-y-2 text-sm text-slate-300">
            <p>
              <span className="text-slate-400">Email:</span> {me.email}
            </p>
            <p>
              <span className="text-slate-400">Roles:</span> {me.roles.join(', ') || 'sin roles'}
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Accesos rápidos" description="Navegación a secciones críticas.">
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button variant="outline" className="w-full justify-start gap-2">
                {link.label}
              </Button>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
