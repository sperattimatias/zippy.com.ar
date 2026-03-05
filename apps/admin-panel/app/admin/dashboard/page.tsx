'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Separator } from '../../../components/ui/separator';
import { Skeleton } from '../../../components/ui/skeleton';

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
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl tracking-tight">Admin Dashboard</CardTitle>
              <CardDescription>Centro operativo para monitorear y accionar sobre la plataforma.</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {(me?.roles ?? ['admin']).join(', ')}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sesión actual</CardTitle>
          <CardDescription>Información de autenticación y roles activos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!me ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-96" />
            </div>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accesos rápidos</CardTitle>
          <CardDescription>Navegación a secciones críticas.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button variant="outline" className="w-full justify-start">
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
