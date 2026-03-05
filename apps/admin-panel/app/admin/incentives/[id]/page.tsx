'use client';

import { useEffect, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState } from '../../../../components/admin/ui';

type Detail = {
  campaign: {
    id: string;
    name: string;
    target_trips?: number | null;
    target_hours?: number | null;
    starts_at: string;
    ends_at: string;
    payout_amount: number;
  };
  progress: Array<{
    driver_id: string;
    trips_completed: number;
    hours_completed: number;
    target_trips?: number | null;
    target_hours?: number | null;
    reached: boolean;
  }>;
  excluded_blocked_drivers: number;
};

export default function IncentiveDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/incentives/${params.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar campaña');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [params.id]);

  return (
    <div className="space-y-6">
      {loading && <LoadingState message="Cargando campaña..." />}
      {error && <ErrorState message={error} retry={() => void load()} />}
      {!loading && !error && !data && <EmptyState message="Campaña no encontrada" />}
      {data && (
        <>
          <AdminCard title={data.campaign.name}>
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <p>Periodo: {new Date(data.campaign.starts_at).toLocaleDateString()} - {new Date(data.campaign.ends_at).toLocaleDateString()}</p>
              <p>Payout: {data.campaign.payout_amount}</p>
              <p>Objetivo viajes: {data.campaign.target_trips ?? '-'}</p>
              <p>Objetivo horas: {data.campaign.target_hours ?? '-'}</p>
              <p>Drivers bloqueados excluidos: {data.excluded_blocked_drivers}</p>
            </div>
          </AdminCard>

          <AdminCard title="Progreso por driver">
            {data.progress.length === 0 ? <EmptyState message="Sin progreso aún" /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="text-left text-slate-400"><th className="p-2">Driver</th><th className="p-2">Viajes</th><th className="p-2">Horas</th><th className="p-2">Cumple</th></tr></thead>
                  <tbody>
                    {data.progress.map((row) => (
                      <tr key={row.driver_id} className="border-t border-slate-800">
                        <td className="p-2">{row.driver_id}</td>
                        <td className="p-2">{row.trips_completed}</td>
                        <td className="p-2">{row.hours_completed.toFixed(2)}</td>
                        <td className="p-2">{row.reached ? 'Sí' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </>
      )}
    </div>
  );
}
