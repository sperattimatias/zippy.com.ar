'use client';

import { useEffect, useState } from 'react';
import { AdminCard, ErrorState, LoadingState, Toast } from '../../../../components/admin/ui';

type PaymentDetail = {
  payment_id: string;
  trip_id: string;
  rider_id: string;
  driver_id: string;
  status: string;
  settlement_status: string;
  method: string;
  created_at: string;
  updated_at: string;
  breakdown: { amount_total: number; fee_platform: number; driver_net: number; refunded_amount: number };
  references: { mp_payment_id?: string | null; mp_preference_id?: string | null; currency: string; commission_bps_applied: number };
  status_history: Array<{ status: string; at: string }>;
  gateway_logs: Array<{ refund_id: string; status: string; mp_refund_id?: string | null; created_at: string }>;
  flags: { duplicate: boolean; not_settled: boolean; note?: string | null };
};

type ToastState = { tone: 'success' | 'error'; message: string } | null;

export default function AdminPaymentDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [flagNote, setFlagNote] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payments/${params.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar el pago');
      setDetail(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [params.id]);

  const createRefund = async () => {
    if (!refundReason.trim()) return setToast({ tone: 'error', message: 'El motivo del reembolso es obligatorio' });
    const payload: { reason: string; amount?: number } = { reason: refundReason.trim() };
    if (refundAmount.trim()) {
      const amount = Number(refundAmount);
      if (!Number.isFinite(amount) || amount <= 0) return setToast({ tone: 'error', message: 'Monto inválido' });
      payload.amount = amount;
    }

    try {
      const res = await fetch(`/api/admin/payments/${params.id}/refund`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('No se pudo crear el reembolso');
      setToast({ tone: 'success', message: 'Reembolso creado correctamente' });
      setRefundAmount('');
      setRefundReason('');
      await load();
    } catch (e) {
      setToast({ tone: 'error', message: e instanceof Error ? e.message : 'Error inesperado' });
    }
  };

  const toggleFlag = async (type: 'duplicate' | 'not_settled') => {
    try {
      const res = await fetch(`/api/admin/payments/${params.id}/flag`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, note: flagNote.trim() || undefined }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar flag');
      setToast({ tone: 'success', message: 'Flag actualizado' });
      await load();
    } catch (e) {
      setToast({ tone: 'error', message: e instanceof Error ? e.message : 'Error inesperado' });
    }
  };

  return (
    <div className="space-y-6">
      {loading && <LoadingState message="Cargando pago..." />}
      {error && <ErrorState message={error} retry={() => void load()} />}

      {!loading && detail && (
        <>
          <AdminCard title={`Pago ${detail.payment_id}`}>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p><span className="text-slate-400">Trip:</span> {detail.trip_id}</p>
              <p><span className="text-slate-400">Status:</span> {detail.status}</p>
              <p><span className="text-slate-400">Settlement:</span> {detail.settlement_status}</p>
              <p><span className="text-slate-400">Método:</span> {detail.method}</p>
              <p><span className="text-slate-400">Rider:</span> {detail.rider_id}</p>
              <p><span className="text-slate-400">Driver:</span> {detail.driver_id}</p>
            </div>
          </AdminCard>

          <AdminCard title="Breakdown y referencias">
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>Amount total: {detail.breakdown.amount_total}</p>
              <p>Fee platform: {detail.breakdown.fee_platform}</p>
              <p>Driver net: {detail.breakdown.driver_net}</p>
              <p>Refunded amount: {detail.breakdown.refunded_amount}</p>
              <p>MP payment id: {detail.references.mp_payment_id ?? '-'}</p>
              <p>MP preference id: {detail.references.mp_preference_id ?? '-'}</p>
            </div>
          </AdminCard>

          <AdminCard title="Historial y logs gateway">
            <div className="space-y-3 text-sm">
              <div>
                <h3 className="mb-2 font-semibold">Historial de estados</h3>
                <ul className="space-y-1 text-slate-300">
                  {detail.status_history.map((h, idx) => <li key={`${h.status}-${idx}`}>{h.status} · {new Date(h.at).toLocaleString()}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Logs</h3>
                <ul className="space-y-1 text-slate-300">
                  {detail.gateway_logs.length === 0 && <li>Sin logs de gateway</li>}
                  {detail.gateway_logs.map((l) => <li key={l.refund_id}>{l.status} · refund={l.refund_id} · mp={l.mp_refund_id ?? '-'} · {new Date(l.created_at).toLocaleString()}</li>)}
                </ul>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Acciones">
            <div className="space-y-3 text-sm">
              <div className="grid gap-2 md:grid-cols-3">
                <input className="rounded bg-slate-950 p-2" placeholder="Monto (vacío = total)" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
                <input className="rounded bg-slate-950 p-2 md:col-span-2" placeholder="Motivo reembolso" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
              </div>
              <button className="rounded bg-rose-700 px-3 py-2 text-white" onClick={() => void createRefund()}>Crear reembolso</button>

              <div className="grid gap-2 md:grid-cols-3">
                <input className="rounded bg-slate-950 p-2 md:col-span-2" placeholder="Nota de auditoría (opcional)" value={flagNote} onChange={(e) => setFlagNote(e.target.value)} />
                <div className="flex gap-2">
                  <button className="rounded bg-amber-600 px-3 py-2 text-white" onClick={() => void toggleFlag('duplicate')}>{detail.flags.duplicate ? 'Quitar' : 'Marcar'} duplicado</button>
                  <button className="rounded bg-indigo-600 px-3 py-2 text-white" onClick={() => void toggleFlag('not_settled')}>{detail.flags.not_settled ? 'Quitar' : 'Marcar'} no acreditado</button>
                </div>
              </div>
            </div>
          </AdminCard>
        </>
      )}

      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
