'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../../../../../components/page/PageHeader';
import { StatusBadge } from '../../../../../components/common/StatusBadge';
import { SectionCard } from '../../../../../components/common/SectionCard';
import { ErrorState } from '../../../../../components/states/ErrorState';
import { LoadingState } from '../../../../../components/states/LoadingState';
import { toast } from '../../../../../lib/toast';

type FraudSignal = {
  id: string;
  type: string;
  severity: string;
  score_delta: number;
  payload_json?: unknown;
  created_at: string;
};

type FraudCaseDetail = {
  fraud_case: {
    id: string;
    title: string;
    summary?: string;
    status: string;
    severity: string;
    primary_user_id?: string | null;
    related_driver_id?: string | null;
    related_trip_id?: string | null;
  };
  signals: FraudSignal[];
};

export default function FraudCaseDetail({ params }: { params: { id: string } }) {
  const [data, setData] = useState<FraudCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [notes, setNotes] = useState('');
  const [assignee, setAssignee] = useState('');
  const [freezePaymentId, setFreezePaymentId] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fraud/cases/${params.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar el caso');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [params.id]);

  const runAction = async (path: string, body: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/fraud/cases/${params.id}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('No se pudo ejecutar la acción');
      toast.success('Acción ejecutada');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error inesperado');
    }
  };

  if (loading) return <LoadingState message="Cargando caso de fraude..." />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!data?.fraud_case) return <ErrorState message="Caso no encontrado" />;

  const fraudCase = data.fraud_case;
  const primaryEntity = fraudCase.primary_user_id ?? '';
  const driverEntity = fraudCase.related_driver_id ?? '';

  return (
    <div className="space-y-6">
      <PageHeader title="Detalle del caso de fraude" subtitle="Revisá señales, evidencia y resolución en un solo lugar." />
      <SectionCard title={`Caso de fraude ${fraudCase.id}`}>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <p><span className="text-slate-400">Título:</span> {fraudCase.title}</p>
          <p><span className="text-slate-400">Estado:</span> <StatusBadge status={fraudCase.status} /></p>
          <p><span className="text-slate-400">Severidad:</span> <StatusBadge status={fraudCase.severity} /></p>
          <p><span className="text-slate-400">Usuario:</span> {fraudCase.primary_user_id ?? '-'}</p>
          <p><span className="text-slate-400">Conductor:</span> {fraudCase.related_driver_id ?? '-'}</p>
          <p><span className="text-slate-400">Viaje:</span> {fraudCase.related_trip_id ?? '-'}</p>
        </div>
        <p className="mt-3 text-sm"><span className="text-slate-400">Summary:</span> {fraudCase.summary ?? '-'}</p>
      </SectionCard>

      <SectionCard title="Señales y evidencias">
        <div className="space-y-2">
          {data.signals.map((s) => (
            <div key={s.id} className="rounded border border-slate-800 p-2 text-xs">
              <div className="mb-1 flex gap-2"><b>{s.type}</b><span>{s.severity}</span><span>Δ{s.score_delta}</span></div>
              <pre className="overflow-x-auto text-slate-300">{JSON.stringify(s.payload_json ?? {}, null, 2)}</pre>
            </div>
          ))}
          {data.signals.length === 0 && <p className="text-sm text-slate-400">Sin señales asociadas.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Acciones operativas de fraude">
        <div className="space-y-3 text-sm">
          <div className="grid gap-2 md:grid-cols-3">
            <input className="rounded bg-slate-950 p-2" placeholder="Nota interna de la acción" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <input className="rounded bg-slate-950 p-2" placeholder="Asignar a agente (ID de usuario)" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            <button className="rounded bg-slate-700 px-3 py-2" onClick={() => void runAction('manual-review', { notes: notes || 'manual review' })}>Revisión manual</button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="rounded bg-rose-700 px-3 py-2" disabled={!primaryEntity} onClick={() => void runAction('block-user', { entity_id: primaryEntity, note: notes })}>Bloquear user</button>
            <button className="rounded bg-amber-700 px-3 py-2" disabled={!driverEntity} onClick={() => void runAction('block-driver', { entity_id: driverEntity, note: notes })}>Bloquear driver</button>
            <button className="rounded bg-emerald-700 px-3 py-2" onClick={() => void runAction('assign', { assigned_to_user_id: assignee || undefined, notes })}>Asignar</button>
            <button className="rounded bg-cyan-700 px-3 py-2" onClick={() => void runAction('resolve', { notes: notes || 'resolved' })}>Confirmar resolución</button>
            <button className="rounded bg-slate-700 px-3 py-2" onClick={() => void runAction('dismiss', { notes: notes || 'dismissed' })}>Descartar</button>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <input className="rounded bg-slate-950 p-2" placeholder="ID de pago (opcional)" value={freezePaymentId} onChange={(e) => setFreezePaymentId(e.target.value)} />
            <button className="rounded bg-indigo-700 px-3 py-2" onClick={() => void runAction('freeze-payments', { payment_id: freezePaymentId || undefined, trip_id: fraudCase.related_trip_id ?? undefined, note: notes || 'freeze payments' })}>Congelar pagos relacionados</button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
