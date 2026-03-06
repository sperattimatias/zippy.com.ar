'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../../../../../components/page/PageHeader';
import { StatusBadge } from '../../../../../components/common/StatusBadge';
import { CopyText } from '../../../../../components/common/CopyText';
import { SectionCard } from '../../../../../components/common/SectionCard';
import { EmptyState } from '../../../../../components/states/EmptyState';
import { ErrorState } from '../../../../../components/states/ErrorState';
import { LoadingState } from '../../../../../components/states/LoadingState';
import { toast } from '../../../../../lib/toast';
import { formatDateTime } from '../../../../../lib/format';

type TicketNote = { id: string; note: string; created_by?: string | null; created_at: string };

type TicketDetail = {
  id: string;
  type: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
  user_id: string;
  driver_id?: string | null;
  trip_id?: string | null;
  assigned_agent?: string | null;
  description: string;
  attachments_json?: string[];
  notes: TicketNote[];
};

const templates = [
  'Hola, estamos revisando tu reclamo. Te daremos una actualización en breve.',
  'Verificamos el viaje y escalamos el caso al área correspondiente.',
  'El caso fue resuelto. Si necesitás más ayuda, respondé a este ticket.',
];

export default function SupportTicketDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [status, setStatus] = useState<TicketDetail['status']>('OPEN');
  const [assignedAgent, setAssignedAgent] = useState('');
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/tickets/${params.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar ticket');
      const data = (await res.json()) as TicketDetail;
      setDetail(data);
      setStatus(data.status);
      setAssignedAgent(data.assigned_agent ?? '');
      setAttachments((data.attachments_json ?? []).join(', '));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const saveTicket = async () => {
    try {
      const attachmentUrls = attachments
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

      const res = await fetch(`/api/admin/support/tickets/${params.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, assigned_agent: assignedAgent, attachments: attachmentUrls }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar ticket');
      toast.success('Ticket actualizado');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error inesperado');
    }
  };

  const addNote = async () => {
    if (!note.trim()) return toast.error('La nota es obligatoria');
    try {
      const res = await fetch(`/api/admin/support/tickets/${params.id}/notes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      });
      if (!res.ok) throw new Error('No se pudo agregar nota');
      toast.success('Nota agregada');
      setNote('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error inesperado');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Ticket detail" subtitle="Seguimiento de ticket, notas y resolución." />
      {loading && <LoadingState message="Cargando ticket..." />}
      {error && <ErrorState message={error} retry={() => void load()} />}

      {!loading && detail && (
        <>
          <SectionCard title={`Ticket ${detail.id}`}>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p><span className="text-slate-400">Type:</span> {detail.type}</p>
              <p><span className="text-slate-400">Status:</span> <StatusBadge status={detail.status} /></p>
              <p><span className="text-slate-400">Priority:</span> {detail.priority}</p>
              <p><span className="text-slate-400">Created:</span> {formatDateTime(detail.created_at)}</p>
              <p><span className="text-slate-400">User:</span> <CopyText value={detail.user_id} /></p>
              <p><span className="text-slate-400">Driver:</span> <CopyText value={detail.driver_id ?? undefined} /></p>
              <p><span className="text-slate-400">Trip:</span> <CopyText value={detail.trip_id ?? undefined} /></p>
              <p><span className="text-slate-400">Assigned:</span> {detail.assigned_agent ?? '-'}</p>
            </div>
            <p className="mt-4 text-sm"><span className="text-slate-400">Descripción:</span> {detail.description}</p>
          </SectionCard>

          <SectionCard title="Gestión">
            <div className="grid gap-2 md:grid-cols-3">
              <select className="rounded bg-slate-950 p-2" value={status} onChange={(e) => setStatus(e.target.value as TicketDetail['status'])}>
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
              <input className="rounded bg-slate-950 p-2" placeholder="Agente asignado (opcional)" value={assignedAgent} onChange={(e) => setAssignedAgent(e.target.value)} />
              <button className="rounded bg-cyan-700 px-3 py-2" onClick={() => void saveTicket()}>Guardar cambios</button>
              <input className="rounded bg-slate-950 p-2 md:col-span-3" placeholder="Adjuntos (URLs separadas por coma)" value={attachments} onChange={(e) => setAttachments(e.target.value)} />
            </div>
          </SectionCard>

          <SectionCard title="Notas internas y plantillas">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl) => (
                  <button key={tpl} className="rounded bg-slate-800 px-2 py-1 text-xs" onClick={() => setNote(tpl)}>Usar plantilla</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <input className="min-w-[320px] rounded bg-slate-950 p-2" placeholder="Nota interna" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className="rounded bg-slate-700 px-3 py-2" onClick={() => void addNote()}>Agregar nota</button>
              </div>
              <ul className="space-y-1 text-sm text-slate-300">
                {detail.notes.map((n) => (
                  <li key={n.id}>• {n.note} <span className="text-slate-500">({formatDateTime(n.created_at)})</span></li>
                ))}
                {detail.notes.length === 0 && <li>Sin notas aún.</li>}
              </ul>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
