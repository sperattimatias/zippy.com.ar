'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/page/PageHeader';
import { SectionCard } from '../../../components/common/SectionCard';
import { EmptyState } from '../../../components/states/EmptyState';
import { ErrorState } from '../../../components/states/ErrorState';
import { LoadingState } from '../../../components/states/LoadingState';

type AuditRow = {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  payload?: unknown;
  created_at: string;
};

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [adminId, setAdminId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (entityType) params.set('entityType', entityType);
      if (adminId) params.set('adminId', adminId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/admin/audit?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando auditoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Auditoría" subtitle="Trazabilidad completa de acciones administrativas." />
      <SectionCard title="Filtros de auditoría">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <input className="rounded bg-slate-950 p-2" placeholder="Acción (ej. trip.cancel)" value={action} onChange={(e) => setAction(e.target.value)} />
          <input className="rounded bg-slate-950 p-2" placeholder="Tipo de entidad (ej. trip, payment)" value={entityType} onChange={(e) => setEntityType(e.target.value)} />
          <input className="rounded bg-slate-950 p-2" placeholder="ID de administrador" value={adminId} onChange={(e) => setAdminId(e.target.value)} />
          <input className="rounded bg-slate-950 p-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="rounded bg-slate-950 p-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="mt-3 rounded bg-cyan-600 px-3 py-2" onClick={() => void load()}>Aplicar filtros</button>
      </SectionCard>

      <SectionCard title="Eventos">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} retry={() => void load()} /> : null}
        {!loading && !error && rows.length === 0 ? <EmptyState message="Sin eventos" /> : null}
        {!loading && !error && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="p-2">Fecha</th><th className="p-2">Admin</th><th className="p-2">Acción</th><th className="p-2">Entidad</th><th className="p-2">Payload</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="p-2">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="p-2">{row.admin_id}</td>
                    <td className="p-2">{row.action}</td>
                    <td className="p-2">{row.entity_type}:{row.entity_id}</td>
                    <td className="p-2"><pre className="whitespace-pre-wrap text-xs text-slate-300">{JSON.stringify(row.payload ?? {}, null, 2)}</pre></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
