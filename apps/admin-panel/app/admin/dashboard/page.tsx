'use client';

import { useEffect, useState } from 'react';

type MePayload = { email: string; roles: string[] };

export default function DashboardPage() {
  const [me, setMe] = useState<MePayload | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setMe({ email: data.email, roles: data.roles ?? [] }));
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-slate-300">Logged in as {me?.email ?? '...'} roles: {(me?.roles ?? []).join(', ')}</p>
    </main>
  );
}
