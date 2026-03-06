'use client';

import { useEffect, useState } from 'react';
import { SectionCard } from '../../../../components/common/SectionCard';
import { EmptyState } from '../../../../components/states/EmptyState';
import { ErrorState } from '../../../../components/states/ErrorState';
import { LoadingState } from '../../../../components/states/LoadingState';
import { toast } from '../../../../lib/toast';

type Setting = { event_key: string; enabled: boolean };
type LogRow = { id: string; event_key: string; channel: string; recipient: string; status: string; error?: string | null; attempts: number; created_at: string };


export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [sRes, lRes] = await Promise.all([
        fetch('/api/admin/notifications/settings', { cache: 'no-store' }),
        fetch('/api/admin/notifications/logs', { cache: 'no-store' }),
      ]);
      if (!sRes.ok || !lRes.ok) throw new Error('No se pudo cargar notificaciones');
      setSettings(await sRes.json());
      setLogs(await lRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const toggle = async (eventKey: string, enabled: boolean) => {
    const res = await fetch(`/api/admin/notifications/settings/${eventKey}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (!res.ok) {
      toast.error('No se pudo actualizar toggle');
      return;
    }
    toast.success('Toggle actualizado');
    await load();
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Settings por evento">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && settings.length === 0 && <EmptyState message="Sin eventos configurados" />}
        {!loading && !error && settings.length > 0 && (
          <div className="space-y-2">
            {settings.map((item) => (
              <div key={item.event_key} className="flex items-center justify-between rounded border border-slate-800 p-2 text-sm">
                <span>{item.event_key}</span>
                <button className={`rounded px-3 py-1 ${item.enabled ? 'bg-emerald-700' : 'bg-slate-700'}`} onClick={() => void toggle(item.event_key, item.enabled)}>
                  {item.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Últimos envíos y fallos">
        {!loading && !error && logs.length === 0 && <EmptyState message="Sin logs" />}
        {!loading && !error && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">Fecha</th><th className="p-2">Evento</th><th className="p-2">Canal</th><th className="p-2">Destinatario</th><th className="p-2">Estado</th><th className="p-2">Intentos</th><th className="p-2">Error</th></tr></thead><tbody>
              {logs.map((log) => <tr key={log.id} className="border-t border-slate-800"><td className="p-2">{new Date(log.created_at).toLocaleString()}</td><td className="p-2">{log.event_key}</td><td className="p-2">{log.channel}</td><td className="p-2">{log.recipient}</td><td className="p-2">{log.status}</td><td className="p-2">{log.attempts}</td><td className="p-2">{log.error ?? '-'}</td></tr>)}
            </tbody></table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
