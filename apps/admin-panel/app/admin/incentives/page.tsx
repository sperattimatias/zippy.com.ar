'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState, Toast } from '../../../components/admin/ui';

type Campaign = {
  id: string;
  name: string;
  target_trips?: number | null;
  target_hours?: number | null;
  starts_at: string;
  ends_at: string;
  payout_amount: number;
  is_active: boolean;
  status?: string;
};

type ToastState = { tone: 'success' | 'error'; message: string } | null;

export default function IncentivesPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const [name, setName] = useState('');
  const [targetTrips, setTargetTrips] = useState('');
  const [targetHours, setTargetHours] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [payout, setPayout] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/incentives', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar campañas');
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createCampaign = async () => {
    if (!name.trim() || !startsAt || !endsAt || !payout) {
      setToast({ tone: 'error', message: 'Completá los campos requeridos' });
      return;
    }
    const payload = {
      name: name.trim(),
      target_trips: targetTrips ? Number(targetTrips) : undefined,
      target_hours: targetHours ? Number(targetHours) : undefined,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      payout_amount: Number(payout),
    };
    const res = await fetch('/api/admin/incentives', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setToast({ tone: 'error', message: 'No se pudo crear campaña' });
      return;
    }
    setToast({ tone: 'success', message: 'Campaña creada' });
    setName(''); setTargetTrips(''); setTargetHours(''); setStartsAt(''); setEndsAt(''); setPayout('');
    await load();
  };

  return (
    <div className="space-y-6">
      <AdminCard title="Nueva campaña">
        <div className="grid gap-2 md:grid-cols-3 text-sm">
          <input className="rounded bg-slate-950 p-2" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded bg-slate-950 p-2" placeholder="Objetivo viajes" type="number" value={targetTrips} onChange={(e) => setTargetTrips(e.target.value)} />
          <input className="rounded bg-slate-950 p-2" placeholder="Objetivo horas" type="number" step="0.1" value={targetHours} onChange={(e) => setTargetHours(e.target.value)} />
          <input className="rounded bg-slate-950 p-2" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <input className="rounded bg-slate-950 p-2" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          <input className="rounded bg-slate-950 p-2" placeholder="Payout" type="number" value={payout} onChange={(e) => setPayout(e.target.value)} />
        </div>
        <button className="mt-3 rounded bg-cyan-600 px-3 py-2" onClick={() => void createCampaign()}>Crear campaña</button>
      </AdminCard>

      <AdminCard title="Campañas">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && items.length === 0 && <EmptyState message="No hay campañas" />}
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400"><th className="p-2">Nombre</th><th className="p-2">Periodo</th><th className="p-2">Objetivos</th><th className="p-2">Payout</th><th className="p-2">Estado</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800">
                    <td className="p-2"><Link className="text-cyan-300 underline" href={`/admin/incentives/${item.id}`}>{item.name}</Link></td>
                    <td className="p-2">{new Date(item.starts_at).toLocaleDateString()} - {new Date(item.ends_at).toLocaleDateString()}</td>
                    <td className="p-2">trips: {item.target_trips ?? '-'} / horas: {item.target_hours ?? '-'}</td>
                    <td className="p-2">{item.payout_amount}</td>
                    <td className="p-2">{item.status ?? (item.is_active ? 'active' : 'inactive')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
