'use client';

import { useEffect, useState } from 'react';
import { AdminCard, ErrorState, LoadingState, Toast } from '../../../../components/admin/ui';

type Detail = {
  id: string;
  user_id: string;
  status: string;
  rejection_reason?: string | null;
  notes?: string | null;
  vehicle?: {
    category: string;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    plate?: string | null;
    color?: string | null;
  } | null;
  activity_summary?: { trips_total: number; cancellations_total: number; payments_total: number };
  documents: Array<{ id: string; type: string; get_url: string; created_at: string }>;
  events: Array<{ id: string; type: string; actor_user_id: string; created_at: string; payload_json?: unknown }>;
};

type ToastState = { tone: 'success' | 'error'; message: string } | null;

export default function DriverDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const [statusReason, setStatusReason] = useState('');
  const [note, setNote] = useState('');

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/drivers/${params.id}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar conductor');
      setDetail(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [params.id]);

  const patchStatus = async (status: 'active' | 'suspended' | 'blocked') => {
    try {
      const response = await fetch(`/api/admin/drivers/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason: statusReason }),
      });
      if (!response.ok) throw new Error('No se pudo actualizar estado');
      setToast({ tone: 'success', message: `Estado actualizado a ${status}.` });
      setStatusReason('');
      await reload();
    } catch (actionError) {
      setToast({ tone: 'error', message: actionError instanceof Error ? actionError.message : 'Error actualizando estado' });
    }
  };

  const resetKyc = async () => {
    try {
      const response = await fetch(`/api/admin/drivers/${params.id}/kyc/reset`, { method: 'PATCH' });
      if (!response.ok) throw new Error('No se pudo resetear KYC');
      setToast({ tone: 'success', message: 'KYC reseteado.' });
      await reload();
    } catch (actionError) {
      setToast({ tone: 'error', message: actionError instanceof Error ? actionError.message : 'Error reseteando KYC' });
    }
  };

  const addNote = async () => {
    if (!note.trim()) {
      setToast({ tone: 'error', message: 'La nota es obligatoria.' });
      return;
    }

    try {
      const response = await fetch(`/api/admin/drivers/${params.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!response.ok) throw new Error('No se pudo guardar nota');
      setToast({ tone: 'success', message: 'Nota agregada.' });
      setNote('');
      await reload();
    } catch (actionError) {
      setToast({ tone: 'error', message: actionError instanceof Error ? actionError.message : 'Error agregando nota' });
    }
  };

  return (
    <div className="space-y-6">
      {loading && <LoadingState message="Cargando conductor..." />}
      {error && <ErrorState message={error} retry={() => void reload()} />}

      {!loading && detail && (
        <>
          <AdminCard title={`Driver ${detail.user_id}`}>
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <p><span className="text-slate-400">Estado:</span> {detail.status}</p>
              <p><span className="text-slate-400">Driver ID:</span> {detail.id}</p>
              <p><span className="text-slate-400">Rechazo:</span> {detail.rejection_reason ?? '-'}</p>
              <p><span className="text-slate-400">Notas:</span> {detail.notes ?? '-'}</p>
            </div>
          </AdminCard>

          <AdminCard title="Vehículo">
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <p><span className="text-slate-400">Categoría:</span> {detail.vehicle?.category ?? '-'}</p>
              <p><span className="text-slate-400">Marca/Modelo:</span> {detail.vehicle ? `${detail.vehicle.brand ?? ''} ${detail.vehicle.model ?? ''}` : '-'}</p>
              <p><span className="text-slate-400">Año:</span> {detail.vehicle?.year ?? '-'}</p>
              <p><span className="text-slate-400">Patente:</span> {detail.vehicle?.plate ?? '-'}</p>
            </div>
          </AdminCard>

          <AdminCard title="Documentos">
            <ul className="space-y-1 text-sm">
              {detail.documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-2">
                  <span>{document.type} — {new Date(document.created_at).toLocaleDateString()}</span>
                  <a className="text-cyan-400" href={document.get_url} target="_blank" rel="noreferrer">Ver</a>
                </li>
              ))}
            </ul>
          </AdminCard>

          <AdminCard title="Actividad">
            <div className="grid gap-2 md:grid-cols-3 text-sm">
              <p><span className="text-slate-400">Viajes:</span> {detail.activity_summary?.trips_total ?? 0}</p>
              <p><span className="text-slate-400">Cancelaciones:</span> {detail.activity_summary?.cancellations_total ?? 0}</p>
              <p><span className="text-slate-400">Pagos:</span> {detail.activity_summary?.payments_total ?? 0}</p>
            </div>
          </AdminCard>

          <AdminCard title="Acciones">
            <div className="space-y-3 text-sm">
              <input className="w-full rounded bg-slate-950 p-2" placeholder="Motivo para suspend/bloquear" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <button className="rounded bg-amber-600 px-3 py-2 text-white" onClick={() => void patchStatus('suspended')}>Suspender</button>
                <button className="rounded bg-rose-700 px-3 py-2 text-white" onClick={() => void patchStatus('blocked')}>Bloquear</button>
                <button className="rounded bg-emerald-600 px-3 py-2 text-white" onClick={() => void patchStatus('active')}>Reactivar</button>
                <button className="rounded bg-slate-700 px-3 py-2" onClick={() => void resetKyc()}>Reset verificación KYC</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input className="min-w-[280px] rounded bg-slate-950 p-2" placeholder="Nota interna" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className="rounded bg-slate-700 px-3 py-2" onClick={() => void addNote()}>Agregar nota</button>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Eventos">
            <ul className="space-y-1 text-sm">
              {detail.events.map((event) => (
                <li key={event.id}>{new Date(event.created_at).toLocaleString()} — {event.type} — actor {event.actor_user_id}</li>
              ))}
            </ul>
          </AdminCard>
        </>
      )}

      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
