'use client';

import { useEffect, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState } from '../../../../components/admin/ui';
import { toast } from '../../../../lib/toast';

type Template = { id: string; key: string; channel: string; title: string; body: string; is_active: boolean };

export default function NotificationTemplatesPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [key, setKey] = useState('');
  const [channel, setChannel] = useState('push');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/notifications/templates', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar templates');
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const saveTemplate = async () => {
    if (!key.trim() || !title.trim() || !body.trim()) {
      toast.error('Completá key/título/body');
      return;
    }
    const res = await fetch('/api/admin/notifications/templates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: key.trim(), channel, title: title.trim(), body: body.trim(), is_active: isActive }),
    });
    if (!res.ok) {
      toast.error('No se pudo guardar template');
      return;
    }
    toast.success('Template guardado');
    setKey(''); setTitle(''); setBody(''); setIsActive(true);
    await load();
  };

  return (
    <div className="space-y-6">
      <AdminCard title="Nuevo template">
        <div className="grid gap-2 md:grid-cols-2 text-sm">
          <input className="rounded bg-slate-950 p-2" placeholder="key" value={key} onChange={(e) => setKey(e.target.value)} />
          <select className="rounded bg-slate-950 p-2" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="push">push</option><option value="email">email</option><option value="sms">sms</option>
          </select>
          <input className="rounded bg-slate-950 p-2 md:col-span-2" placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="rounded bg-slate-950 p-2 md:col-span-2" placeholder="body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Activo</label>
        </div>
        <button className="mt-3 rounded bg-cyan-600 px-3 py-2" onClick={() => void saveTemplate()}>Guardar</button>
      </AdminCard>

      <AdminCard title="Templates">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} retry={() => void load()} />}
        {!loading && !error && items.length === 0 && <EmptyState message="No hay templates" />}
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">Key</th><th className="p-2">Canal</th><th className="p-2">Título</th><th className="p-2">Activo</th></tr></thead><tbody>
              {items.map((item) => <tr key={item.id} className="border-t border-slate-800"><td className="p-2">{item.key}</td><td className="p-2">{item.channel}</td><td className="p-2">{item.title}</td><td className="p-2">{item.is_active ? 'Sí' : 'No'}</td></tr>)}
            </tbody></table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
