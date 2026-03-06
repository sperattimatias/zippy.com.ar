'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AdminCard, ErrorState, LoadingState } from '../../../../components/admin/ui';
import { ConfirmDialog } from '../../../../components/forms/confirm-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../../components/forms/form';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { toast } from '../../../../components/ui/sonner';
import { can } from '../../../../lib/admin-rbac';

type PaymentDetail = {
  payment_id: string;
  trip_id: string;
  rider_id: string;
  driver_id: string;
  status: string;
  settlement_status: string;
  method: string;
  breakdown: { amount_total: number; fee_platform: number; driver_net: number; refunded_amount: number };
  references: { mp_payment_id?: string | null; mp_preference_id?: string | null };
  status_history: Array<{ status: string; at: string }>;
  gateway_logs: Array<{ refund_id: string; status: string; mp_refund_id?: string | null; created_at: string }>;
  flags: { duplicate: boolean; not_settled: boolean; note?: string | null };
};

const refundSchema = z.object({
  amount: z.string().optional(),
  reason: z.string().trim().min(1, 'El motivo es obligatorio'),
}).superRefine((data, ctx) => {
  if (!data.amount?.trim()) return;
  const parsed = Number(data.amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message: 'Monto inválido' });
  }
});

type RefundForm = z.infer<typeof refundSchema>;

export default function AdminPaymentDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[] | undefined>(undefined);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [flagNote, setFlagNote] = useState('');

  const refundForm = useForm<RefundForm>({
    resolver: zodResolver(refundSchema),
    defaultValues: { amount: '', reason: '' },
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, meRes] = await Promise.all([
        fetch(`/api/admin/payments/${params.id}`, { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' }),
      ]);
      if (!detailRes.ok) throw new Error('No se pudo cargar el pago');
      const json = (await detailRes.json()) as PaymentDetail;
      setDetail(json);
      setFlagNote(json.flags.note ?? '');
      if (meRes.ok) {
        const me = (await meRes.json()) as { roles?: string[] };
        setRoles(me.roles ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const createRefund = async (values: RefundForm) => {
    const payload: { reason: string; amount?: number } = { reason: values.reason.trim() };
    if (values.amount?.trim()) payload.amount = Number(values.amount);

    setRefundLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${params.id}/refund`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('No se pudo crear el reembolso');
      toast('Reembolso creado correctamente', 'success');
      refundForm.reset({ amount: '', reason: '' });
      setRefundOpen(false);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error inesperado', 'error');
    } finally {
      setRefundLoading(false);
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
      toast('Flag actualizado', 'success');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error inesperado', 'error');
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
              <p><span className="text-slate-400">Trip:</span> <Link className="text-cyan-400" href={`/admin/trips/${detail.trip_id}`}>{detail.trip_id}</Link></p>
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

          <AdminCard title="Historial de estado">
            <ul className="space-y-1 text-sm">
              {detail.status_history.map((entry) => (
                <li key={`${entry.status}-${entry.at}`}>{entry.status} · {new Date(entry.at).toLocaleString()}</li>
              ))}
            </ul>
          </AdminCard>

          <AdminCard title="Gateway logs">
            <ul className="space-y-1 text-sm">
              {detail.gateway_logs.length === 0 ? <li>Sin logs de refund</li> : detail.gateway_logs.map((l) => (
                <li key={l.refund_id}>{l.status} · refund={l.refund_id} · mp={l.mp_refund_id ?? '-'} · {new Date(l.created_at).toLocaleString()}</li>
              ))}
            </ul>
          </AdminCard>

          <AdminCard title="Flags y acciones">
            <div className="space-y-3 text-sm">
              <Input value={flagNote} onChange={(e) => setFlagNote(e.target.value)} placeholder="Nota de auditoría para flags" />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void toggleFlag('duplicate')}>Toggle duplicate</Button>
                <Button variant="secondary" onClick={() => void toggleFlag('not_settled')}>Toggle not_settled</Button>
                <Button variant="destructive" onClick={() => { setRefundOpen(true); refundForm.reset({ amount: '', reason: '' }); }} disabled={!can(roles, 'payments.refund')}>
                  Crear reembolso
                </Button>
              </div>
            </div>
          </AdminCard>
        </>
      )}

      <ConfirmDialog
        open={refundOpen}
        title="Crear reembolso"
        description="Genera un refund en gateway y registra auditoría."
        confirmLabel="Confirmar refund"
        loading={refundLoading}
        onClose={() => setRefundOpen(false)}
        onConfirm={refundForm.handleSubmit(async (values) => createRefund(values))}
      >
        <Form {...refundForm}>
          <form className="space-y-3" onSubmit={refundForm.handleSubmit(async (values) => createRefund(values))}>
            <FormField
              control={refundForm.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Vacío = reembolso total" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={refundForm.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </ConfirmDialog>
    </div>
  );
}
