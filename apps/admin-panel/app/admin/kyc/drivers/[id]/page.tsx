'use client';

import { useEffect, useState } from 'react';
import { AdminCard, ErrorState, LoadingState, Toast } from '../../../../../components/admin/ui';

type DriverDocument = {
  id: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REUPLOAD_REQUESTED';
  get_url: string;
  created_at: string;
  expires_at?: string | null;
  review_reason?: string | null;
};

type KycDetail = {
  id: string;
  user_id: string;
  status: string;
  notes?: string | null;
  missing_documents: string[];
  upcoming_expirations: Array<{ id: string; type: string; expires_at: string }>;
  documents: DriverDocument[];
};

export default function DriverKycDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<KycDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kyc/drivers/${params.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar detalle KYC');
      setDetail(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [params.id]);

  const patchDoc = async (documentId: string, status: DriverDocument['status']) => {
    try {
      const res = await fetch(`/api/admin/kyc/drivers/${params.id}/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, reason: reason || undefined, expires_at: expiresAt || undefined }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar documento');
      setToast({ tone: 'success', message: 'Documento actualizado' });
      await load();
    } catch (e) {
      setToast({ tone: 'error', message: e instanceof Error ? e.message : 'Error inesperado' });
    }
  };

  const resetKyc = async () => {
    try {
      const res = await fetch(`/api/admin/drivers/${params.id}/kyc/reset`, { method: 'PATCH' });
      if (!res.ok) throw new Error('No se pudo resetear KYC');
      setToast({ tone: 'success', message: 'KYC reseteado' });
      await load();
    } catch (e) {
      setToast({ tone: 'error', message: e instanceof Error ? e.message : 'Error inesperado' });
    }
  };

  if (loading) return <LoadingState message="Cargando detalle KYC..." />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!detail) return <ErrorState message="Driver no encontrado" />;

  return (
    <div className="space-y-6">
      <AdminCard title={`KYC Driver ${detail.id}`}>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <p><span className="text-slate-400">User:</span> {detail.user_id}</p>
          <p><span className="text-slate-400">Estado KYC:</span> {detail.status}</p>
          <p className="md:col-span-2"><span className="text-slate-400">Faltantes:</span> {detail.missing_documents.length ? detail.missing_documents.join(', ') : 'Sin faltantes'}</p>
          <p className="md:col-span-2"><span className="text-slate-400">Observaciones:</span> {detail.notes ?? '-'}</p>
        </div>
      </AdminCard>

      <AdminCard title="Acciones generales">
        <div className="flex flex-wrap gap-2">
          <input className="rounded bg-slate-950 p-2" placeholder="Motivo / observación" value={reason} onChange={(e) => setReason(e.target.value)} />
          <input type="date" className="rounded bg-slate-950 p-2" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          <button className="rounded bg-amber-700 px-3 py-2" onClick={() => void resetKyc()}>Reset verificación</button>
        </div>
      </AdminCard>

      <AdminCard title="Documentos">
        <div className="space-y-3">
          {detail.documents.map((doc) => (
            <div key={doc.id} className="rounded border border-slate-800 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{doc.type}</p>
                  <p className="text-slate-400">Estado: {doc.status}</p>
                  <p className="text-slate-400">Expira: {doc.expires_at ? new Date(doc.expires_at).toLocaleDateString() : '-'}</p>
                  <p className="text-slate-400">Obs: {doc.review_reason ?? '-'}</p>
                </div>
                <a className="text-cyan-400" href={doc.get_url} target="_blank" rel="noreferrer">Ver documento</a>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="rounded bg-emerald-700 px-2 py-1 text-xs" onClick={() => void patchDoc(doc.id, 'APPROVED')}>Aprobar</button>
                <button className="rounded bg-rose-700 px-2 py-1 text-xs" onClick={() => void patchDoc(doc.id, 'REJECTED')}>Rechazar</button>
                <button className="rounded bg-indigo-700 px-2 py-1 text-xs" onClick={() => void patchDoc(doc.id, 'REUPLOAD_REQUESTED')}>Solicitar re-upload</button>
                <button className="rounded bg-slate-700 px-2 py-1 text-xs" onClick={() => void patchDoc(doc.id, 'PENDING')}>Marcar pendiente</button>
              </div>
            </div>
          ))}
          {detail.documents.length === 0 && <p className="text-sm text-slate-400">Sin documentos cargados.</p>}
        </div>
      </AdminCard>

      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
