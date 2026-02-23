'use client';
import { useEffect, useState } from 'react';

type TripDetail = { id: string; status: string; events: Array<{ id: string; type: string; created_at: string }>; locations: Array<{ id: string; lat: number; lng: number; created_at: string }> };

export default function AdminTripDetailPage({ params }: { params: { id: string } }) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  useEffect(() => { fetch(`/api/admin/trips/${params.id}`, { cache: 'no-store' }).then(r => r.json()).then(setTrip); }, [params.id]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-xl border border-slate-800 p-4">
        <h1 className="text-2xl font-bold">Trip {trip?.id}</h1>
        <p className="text-slate-300">Estado: {trip?.status}</p>
      </section>

      <section className="rounded-xl border border-slate-800 p-4">
        <h2 className="mb-2 text-xl">Eventos</h2>
        <ul className="space-y-1 text-sm">{trip?.events?.map((e) => <li key={e.id}>{new Date(e.created_at).toLocaleString()} — {e.type}</li>)}</ul>
      </section>

      <section className="rounded-xl border border-slate-800 p-4">
        <h2 className="mb-2 text-xl">Locations</h2>
        <div className="mb-2 rounded bg-slate-900 p-3 text-sm text-slate-400">Map placeholder (Sprint 3)</div>
        <ul className="space-y-1 text-sm">{trip?.locations?.map((l) => <li key={l.id}>{new Date(l.created_at).toLocaleString()} — {l.lat}, {l.lng}</li>)}</ul>
      </section>
    </main>
  );
}
