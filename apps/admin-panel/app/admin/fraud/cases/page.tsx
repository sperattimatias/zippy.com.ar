'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../../../components/page/PageHeader';
import { SectionCard } from '../../../../components/common/SectionCard';
import { EmptyState } from '../../../../components/states/EmptyState';
import { ErrorState } from '../../../../components/states/ErrorState';
import { LoadingState } from '../../../../components/states/LoadingState';

type FraudCase = {
  id: string;
  status: string;
  severity: string;
  title: string;
  summary?: string;
  created_at: string;
  primary_user_id?: string | null;
  related_driver_id?: string | null;
  related_trip_id?: string | null;
};

export default function FraudCasesPage() {
  const [rows, setRows] = useState<FraudCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [q, setQ] = useState('');

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (severity) p.set('severity', severity);
    if (q) p.set('q', q);
    return p.toString();
  }, [status, severity, q]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fraud/cases${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar casos de fraude');
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [qs]);

  return (
    <div className="space-y-6">
      <PageHeader title="Casos de fraude" subtitle="Monitoreá alertas, priorizá casos y tomá decisiones operativas." />

      <SectionCard title="Filtros de búsqueda">
        <div className="grid gap-2 md:grid-cols-4">
          <select className="rounded bg-slate-950 p-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="rounded bg-slate-950 p-2" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">Todas las severidades</option>
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="rounded bg-slate-950 p-2 md:col-span-2" placeholder="Buscar por título o resumen" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard title="Listado de casos">
        {loading && <LoadingState message="Cargando casos..." />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && rows.length === 0 && <EmptyState message="No hay casos para los filtros seleccionados." />}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-2">ID</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">Severidad</th>
                  <th className="p-2">Título</th>
                  <th className="p-2">Score/Evidencia</th>
                  <th className="p-2">Entidades</th>
                  <th className="p-2">Creado</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800 align-top">
                    <td className="p-2 font-mono text-xs">{r.id}</td>
                    <td className="p-2">{r.status}</td>
                    <td className="p-2">{r.severity}</td>
                    <td className="p-2">{r.title}</td>
                    <td className="p-2 max-w-[220px] truncate">{r.summary ?? '-'}</td>
                    <td className="p-2 text-xs">
                      <div>user: {r.primary_user_id ?? '-'}</div>
                      <div>driver: {r.related_driver_id ?? '-'}</div>
                      <div>trip: {r.related_trip_id ?? '-'}</div>
                    </td>
                    <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-2"><Link className="text-cyan-400" href={`/admin/fraud/cases/${r.id}`}>Abrir</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
