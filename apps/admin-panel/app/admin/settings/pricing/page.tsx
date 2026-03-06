'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState } from '../../../../components/admin/ui';
import { toast } from '../../../../lib/toast';

type Pricing = {
  base_fare: number;
  per_km: number;
  per_min: number;
  minimum: number;
  cancel_fee: number;
  surge: number;
  night_fee?: number;
};


const DEFAULTS: Pricing = {
  base_fare: 800,
  per_km: 250,
  per_min: 80,
  minimum: 1200,
  cancel_fee: 500,
  surge: 1,
  night_fee: 0,
};

export default function AdminPricingSettingsPage() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
    const [km, setKm] = useState('5');
  const [min, setMin] = useState('10');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pricing', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar pricing');
      const data = (await res.json()) as Partial<Pricing>;
      setPricing({ ...DEFAULTS, ...data });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!pricing) return;
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricing),
      });
      if (!res.ok) throw new Error('No se pudo guardar pricing');
      toast.success('Pricing actualizado');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error inesperado');
    }
  };

  const estimate = useMemo(() => {
    if (!pricing) return 0;
    const k = Number(km) || 0;
    const m = Number(min) || 0;
    const subtotal = pricing.base_fare + k * pricing.per_km + m * pricing.per_min + (pricing.night_fee ?? 0);
    const surged = subtotal * Math.max(1, pricing.surge || 1);
    return Math.round(Math.max(pricing.minimum, surged));
  }, [pricing, km, min]);

  return (
    <div className="space-y-4">
      <AdminCard title="Pricing">
        {loading && <LoadingState message="Cargando pricing..." />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && !pricing && <EmptyState message="Sin configuración de pricing" />}
        {!loading && !error && pricing && (
          <div className="space-y-3 text-sm">
            <div className="grid gap-2 md:grid-cols-3">
              <label className="space-y-1"><span>Base fare</span><input className="w-full rounded bg-slate-950 p-2" type="number" value={pricing.base_fare} onChange={(e) => setPricing({ ...pricing, base_fare: Number(e.target.value) })} /></label>
              <label className="space-y-1"><span>Per km</span><input className="w-full rounded bg-slate-950 p-2" type="number" value={pricing.per_km} onChange={(e) => setPricing({ ...pricing, per_km: Number(e.target.value) })} /></label>
              <label className="space-y-1"><span>Per min</span><input className="w-full rounded bg-slate-950 p-2" type="number" value={pricing.per_min} onChange={(e) => setPricing({ ...pricing, per_min: Number(e.target.value) })} /></label>
              <label className="space-y-1"><span>Minimum</span><input className="w-full rounded bg-slate-950 p-2" type="number" value={pricing.minimum} onChange={(e) => setPricing({ ...pricing, minimum: Number(e.target.value) })} /></label>
              <label className="space-y-1"><span>Cancel fee</span><input className="w-full rounded bg-slate-950 p-2" type="number" value={pricing.cancel_fee} onChange={(e) => setPricing({ ...pricing, cancel_fee: Number(e.target.value) })} /></label>
              <label className="space-y-1"><span>Surge</span><input className="w-full rounded bg-slate-950 p-2" type="number" step="0.1" value={pricing.surge} onChange={(e) => setPricing({ ...pricing, surge: Number(e.target.value) })} /></label>
              <label className="space-y-1"><span>Night fee (opcional)</span><input className="w-full rounded bg-slate-950 p-2" type="number" value={pricing.night_fee ?? 0} onChange={(e) => setPricing({ ...pricing, night_fee: Number(e.target.value) })} /></label>
            </div>
            <button className="rounded bg-cyan-600 px-3 py-2" onClick={() => void save()}>Guardar pricing</button>
          </div>
        )}
      </AdminCard>

      <AdminCard title="Simulador">
        <div className="grid gap-2 md:grid-cols-3 text-sm">
          <label className="space-y-1"><span>Km</span><input className="w-full rounded bg-slate-950 p-2" type="number" value={km} onChange={(e) => setKm(e.target.value)} /></label>
          <label className="space-y-1"><span>Minutos</span><input className="w-full rounded bg-slate-950 p-2" type="number" value={min} onChange={(e) => setMin(e.target.value)} /></label>
          <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-slate-400">Estimado</p>
            <p className="text-lg font-semibold">${estimate}</p>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
