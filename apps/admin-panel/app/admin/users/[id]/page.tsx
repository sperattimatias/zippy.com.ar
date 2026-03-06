'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../../components/page/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { SectionCard } from '../../../../components/common/SectionCard';
import { EmptyState } from '../../../../components/states/EmptyState';
import { ErrorState } from '../../../../components/states/ErrorState';
import { LoadingState } from '../../../../components/states/LoadingState';
import { toast } from '../../../../lib/toast';

type UserDetail = {
  id: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  flags?: { payment_limited?: boolean };
  notes?: string | null;
  history?: { trips: unknown[]; cancellations: unknown[]; claims: unknown[]; fraud: unknown[] };
};


export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
    const [note, setNote] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${params.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar usuario');
      setDetail(await res.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [params.id]);

  const patchStatus = async (status: 'active' | 'blocked') => {
    try {
      const res = await fetch(`/api/admin/users/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar estado');
      toast.success(`Estado actualizado a ${status}`);
      await load();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Error actualizando estado');
    }
  };

  const togglePaymentLimit = async () => {
    try {
      const next = !(detail?.flags?.payment_limited ?? false);
      const res = await fetch(`/api/admin/users/${params.id}/payment-limit`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payment_limited: next }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar flag de pagos');
      toast.success(`Payment limit ${next ? 'activado' : 'desactivado'}`);
      await load();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Error actualizando flag');
    }
  };

  const addNote = async () => {
    if (!note.trim()) {
      toast.error('La nota es obligatoria');
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${params.id}/notes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error('No se pudo guardar nota');
      toast.success('Nota agregada');
      setNote('');
      await load();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Error agregando nota');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="User detail" subtitle="Información, historial y acciones sobre la cuenta." />
      {loading && <LoadingState message="Cargando usuario..." />}
      {error && <ErrorState message={error} retry={() => void load()} />}

      {!loading && detail && (
        <>
          <SectionCard title={`Usuario ${detail.id}`}>
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <p><span className="text-slate-400">Email:</span> {detail.email}</p>
              <p><span className="text-slate-400">Phone:</span> {detail.phone ?? '-'}</p>
              <p><span className="text-slate-400">Estado:</span> <StatusBadge status={detail.status} /></p>
              <p><span className="text-slate-400">Creado:</span> {new Date(detail.created_at).toLocaleString()}</p>
              <p><span className="text-slate-400">Payment limited:</span> {detail.flags?.payment_limited ? 'Sí' : 'No'}</p>
              <p><span className="text-slate-400">Notas:</span> {detail.notes ?? '-'}</p>
            </div>
          </SectionCard>

          <SectionCard title="Historial">
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <p>Viajes: {detail.history?.trips?.length ?? 0}</p>
              <p>Cancelaciones: {detail.history?.cancellations?.length ?? 0}</p>
              <p>Reclamos: {detail.history?.claims?.length ?? 0}</p>
              <p>Fraude: {detail.history?.fraud?.length ?? 0}</p>
            </div>
          </SectionCard>

          <SectionCard title="Acciones" action={<Link className="text-xs text-cyan-300 underline" href={`/admin/audit?entityType=user&entityId=${params.id}`}>Ver auditoría</Link>}>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <button className="rounded bg-rose-700 px-3 py-2 text-white" onClick={() => void patchStatus('blocked')}>Bloquear</button>
                <button className="rounded bg-emerald-600 px-3 py-2 text-white" onClick={() => void patchStatus('active')}>Desbloquear</button>
                <button className="rounded bg-amber-600 px-3 py-2 text-white" onClick={() => void togglePaymentLimit()}>{detail.flags?.payment_limited ? 'Quitar límite pagos' : 'Limitar pagos'}</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input className="min-w-[300px] rounded bg-slate-950 p-2" value={note} placeholder="Nota interna" onChange={(e) => setNote(e.target.value)} />
                <button className="rounded bg-slate-700 px-3 py-2" onClick={() => void addNote()}>Agregar nota</button>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
