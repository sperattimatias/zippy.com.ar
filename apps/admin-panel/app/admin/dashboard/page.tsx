'use client';

import { useEffect, useState } from 'react';

type MePayload = { email: string; roles: string[] };

export default function DashboardPage() {
  const [me, setMe] = useState<MePayload | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('zippy_access_token');
    if (!token) return;

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setMe({ email: data.email, roles: data.roles ?? [] }));
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="mt-3 text-slate-300">
        Logged in as {me?.email ?? '...'} roles: {(me?.roles ?? []).join(', ')}
      </p>
    </main>
  );
}
