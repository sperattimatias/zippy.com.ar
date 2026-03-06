'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../../components/page/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { SectionCard } from '../../../../components/common/SectionCard';
import { EmptyState } from '../../../../components/states/EmptyState';
import { ErrorState } from '../../../../components/states/ErrorState';
import { LoadingState } from '../../../../components/states/LoadingState';
import { ReasonDialog } from '../../../../components/forms/reason-dialog';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { toast } from '../../../../lib/toast';

type DriverDetail = {
  id: string;
  user_id: string;
  status: string;
  rejection_reason?: string | null;
  notes?: string | null;
  vehicle?: { category?: string | null; brand?: string | null; model?: string | null; year?: number | null; plate?: string | null } | null;
  documents: Array<{ id: string; type: string; created_at: string; get_url: string }>;
  activity_summary?: { trips_total: number; cancellations_total: number; payments_total: number };
  events: Array<{ id: string; type: string; created_at: string; actor_user_id: string }>;
};

export default function AdminDriverDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/drivers/${params.id}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar conductor');
      const data = (await response.json()) as DriverDetail;
      setDetail(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [params.id]);

  const patchStatus = async (status: 'active' | 'suspended' | 'blocked', reason: string) => {
    setStatusLoading(true);
    try {
      const response = await fetch(`/api/admin/drivers/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      if (!response.ok) throw new Error('No se pudo actualizar estado');
      toast.success(`Estado actualizado a ${status}.`);
      setSuspendOpen(false);
      setBlockOpen(false);
      await reload();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Error actualizando estado');
    } finally {
      setStatusLoading(false);
    }
  };

  const resetKyc = async () => {
    try {
      const response = await fetch(`/api/admin/drivers/${params.id}/kyc/reset`, { method: 'PATCH' });
      if (!response.ok) throw new Error('No se pudo resetear KYC');
      toast.success('KYC reseteado.');
      await reload();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Error reseteando KYC');
    }
  };

  const addNote = async () => {
    if (!note.trim()) {
      toast.error('La nota es obligatoria.');
      return;
    }

    try {
      const response = await fetch(`/api/admin/drivers/${params.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!response.ok) throw new Error('No se pudo guardar nota');
      toast.success('Nota agregada.');
      setNote('');
      await reload();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Error agregando nota');
    }
  };

  const reactivate = async () => {
    await patchStatus('active', 'Reactivación manual desde admin');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Detalle del conductor" subtitle="Estado operativo, documentación y acciones sobre la cuenta." />
      {loading && <LoadingState message="Cargando conductor..." />}
      {error && <ErrorState message={error} retry={() => void reload()} />}

      {!loading && detail && (
        <>
          <SectionCard title={`Driver ${detail.user_id}`}>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p><span className="text-slate-400">Estado:</span> <StatusBadge status={detail.status} /></p>
              <p><span className="text-slate-400">Driver ID:</span> {detail.id}</p>
              <p><span className="text-slate-400">Rechazo:</span> {detail.rejection_reason ?? '-'}</p>
              <p><span className="text-slate-400">Notas:</span> {detail.notes ?? '-'}</p>
            </div>
          </SectionCard>

          <SectionCard title="Vehículo">
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p><span className="text-slate-400">Categoría:</span> {detail.vehicle?.category ?? '-'}</p>
              <p><span className="text-slate-400">Marca/Modelo:</span> {detail.vehicle ? `${detail.vehicle.brand ?? ''} ${detail.vehicle.model ?? ''}` : '-'}</p>
              <p><span className="text-slate-400">Año:</span> {detail.vehicle?.year ?? '-'}</p>
              <p><span className="text-slate-400">Patente:</span> {detail.vehicle?.plate ?? '-'}</p>
            </div>
          </SectionCard>

          <SectionCard title="Documentos">
            <ul className="space-y-1 text-sm">
              {detail.documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-2">
                  <span>{document.type} — {new Date(document.created_at).toLocaleDateString()}</span>
                  <a className="text-cyan-400" href={document.get_url} target="_blank" rel="noreferrer">Ver</a>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Actividad">
            <div className="grid gap-2 text-sm md:grid-cols-3">
              <p><span className="text-slate-400">Viajes:</span> {detail.activity_summary?.trips_total ?? 0}</p>
              <p><span className="text-slate-400">Cancelaciones:</span> {detail.activity_summary?.cancellations_total ?? 0}</p>
              <p><span className="text-slate-400">Pagos:</span> {detail.activity_summary?.payments_total ?? 0}</p>
            </div>
          </SectionCard>

          <SectionCard title="Acciones" action={<Link className="text-xs text-cyan-300 underline" href={`/admin/audit?entityType=driver&entityId=${params.id}`}>Ver auditoría</Link>}>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Button className="bg-amber-600 hover:bg-amber-500" onClick={() => setSuspendOpen(true)}>Suspender</Button>
                <Button variant="destructive" onClick={() => setBlockOpen(true)}>Bloquear</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => void reactivate()}>Reactivar</Button>
                <Button variant="secondary" onClick={() => void resetKyc()}>Reset verificación KYC</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input className="min-w-[280px]" placeholder="Nota interna" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button variant="secondary" onClick={() => void addNote()}>Agregar nota</Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Eventos">
            <ul className="space-y-1 text-sm">
              {detail.events.map((event) => (
                <li key={event.id}>{new Date(event.created_at).toLocaleString()} — {event.type} — actor {event.actor_user_id}</li>
              ))}
            </ul>
          </SectionCard>
        </>
      )}

      <ReasonDialog
        open={suspendOpen}
        title="Suspender conductor"
        description="Ingresá el motivo para auditar la suspensión."
        reasonLabel="Motivo de suspensión"
        loading={statusLoading}
        onClose={() => setSuspendOpen(false)}
        onConfirm={(reason) => patchStatus('suspended', reason)}
      />

      <ReasonDialog
        open={blockOpen}
        title="Bloquear conductor"
        description="Ingresá el motivo para auditar el bloqueo."
        reasonLabel="Motivo de bloqueo"
        loading={statusLoading}
        onClose={() => setBlockOpen(false)}
        onConfirm={(reason) => patchStatus('blocked', reason)}
      />
    </div>
  );
}
