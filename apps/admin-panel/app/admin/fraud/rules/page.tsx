'use client';

import { useEffect, useState } from 'react';
import { AdminCard, ErrorState, LoadingState, Toast } from '../../../../components/admin/ui';

export default function FraudRulesPage() {
  const [json, setJson] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/fraud/rules', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar reglas');
      const data = await res.json();
      setJson(JSON.stringify(data?.value_json ?? {}, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    try {
      const parsed = JSON.parse(json);
      const res = await fetch('/api/admin/fraud/rules', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value_json: parsed }),
      });
      if (!res.ok) throw new Error('No se pudieron guardar reglas');
      setToast({ tone: 'success', message: 'Reglas actualizadas' });
    } catch (e) {
      setToast({ tone: 'error', message: e instanceof Error ? e.message : 'JSON inválido' });
    }
  };

  if (loading) return <LoadingState message="Cargando reglas de fraude..." />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fraud Rules</h1>
      <AdminCard title="Thresholds / flags / cooldowns">
        <textarea className="h-[420px] w-full rounded bg-slate-950 p-3 font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} />
        <div className="mt-3 flex justify-end">
          <button className="rounded bg-cyan-700 px-3 py-2 text-sm" onClick={() => void save()}>Guardar reglas</button>
        </div>
      </AdminCard>
      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
