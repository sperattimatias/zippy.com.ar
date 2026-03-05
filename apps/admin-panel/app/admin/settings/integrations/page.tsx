'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState, Toast } from '../../../../components/admin/ui';

type Category = 'payments' | 'email' | 'maps';

type SettingRow = {
  key: string;
  category: Category | string;
  value: string | null;
  masked_value: string | null;
  is_encrypted: boolean;
};

type ToastState = { tone: 'success' | 'error'; message: string } | null;

const modeOptions = ['sandbox', 'production'] as const;
const smtpEncryptionOptions = ['none', 'ssl', 'tls', 'starttls'] as const;

export default function IntegrationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [rows, setRows] = useState<SettingRow[]>([]);

  const [payments, setPayments] = useState({
    mercadopago_public_key: '',
    mercadopago_access_token: '',
    mercadopago_webhook_secret: '',
    mercadopago_mode: 'sandbox',
  });
  const [email, setEmail] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_encryption: 'tls',
    smtp_from_name: '',
    smtp_from_email: '',
  });
  const [maps, setMaps] = useState({ google_maps_api_key: '' });

  const [testingMp, setTestingMp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [mpStatus, setMpStatus] = useState('');
  const [smtpStatus, setSmtpStatus] = useState('');

  const encryptedExisting = useMemo(() => {
    const asMap = new Map<string, SettingRow>();
    rows.forEach((row) => asMap.set(row.key, row));
    return {
      mercadopago_access_token: !!asMap.get('mercadopago_access_token')?.masked_value,
      mercadopago_webhook_secret: !!asMap.get('mercadopago_webhook_secret')?.masked_value,
      smtp_password: !!asMap.get('smtp_password')?.masked_value,
      google_maps_api_key: !!asMap.get('google_maps_api_key')?.masked_value,
    };
  }, [rows]);

  const loadCategory = async (category: Category) => {
    const res = await fetch(`/api/admin/settings?category=${category}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`No se pudo cargar categoría ${category}`);
    return (await res.json()) as SettingRow[];
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [paymentsRows, emailRows, mapsRows] = await Promise.all([
        loadCategory('payments'),
        loadCategory('email'),
        loadCategory('maps'),
      ]);
      const merged = [...paymentsRows, ...emailRows, ...mapsRows];
      setRows(merged);

      const getPlain = (key: string) => merged.find((item) => item.key === key)?.value ?? '';
      setPayments({
        mercadopago_public_key: getPlain('mercadopago_public_key'),
        mercadopago_access_token: '',
        mercadopago_webhook_secret: '',
        mercadopago_mode: (getPlain('mercadopago_mode') || 'sandbox').toLowerCase(),
      });
      setEmail({
        smtp_host: getPlain('smtp_host'),
        smtp_port: getPlain('smtp_port') || '587',
        smtp_user: getPlain('smtp_user'),
        smtp_password: '',
        smtp_encryption: (getPlain('smtp_encryption') || 'tls').toLowerCase(),
        smtp_from_name: getPlain('smtp_from_name'),
        smtp_from_email: getPlain('smtp_from_email'),
      });
      setMaps({ google_maps_api_key: '' });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const putSetting = async (key: string, payload: { value: string; category: Category; encrypted?: boolean }) => {
    const response = await fetch(`/api/admin/settings/${key}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message ?? `No se pudo guardar ${key}`);
    }
  };

  const testMercadoPago = async () => {
    setTestingMp(true);
    setMpStatus('Probando conexión...');
    try {
      const res = await fetch('/api/admin/settings/test/mercadopago', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMpStatus('✅ Conexión exitosa');
        setToast({ tone: 'success', message: 'MercadoPago conectado correctamente.' });
      } else {
        const message = data.error ?? data.message ?? 'Falló la prueba de MercadoPago';
        setMpStatus(`❌ ${message}`);
        setToast({ tone: 'error', message });
      }
    } catch {
      setMpStatus('❌ Error de conexión');
      setToast({ tone: 'error', message: 'No se pudo probar MercadoPago.' });
    } finally {
      setTestingMp(false);
    }
  };

  const testSmtp = async () => {
    const toEmail = window.prompt('Ingresá el email destinatario para la prueba SMTP:');
    if (!toEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      setToast({ tone: 'error', message: 'Email de prueba inválido.' });
      return;
    }

    setTestingSmtp(true);
    setSmtpStatus('Enviando email de prueba...');
    try {
      const res = await fetch('/api/admin/settings/test/smtp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSmtpStatus(`✅ Email enviado a ${toEmail}`);
        setToast({ tone: 'success', message: 'Email de prueba enviado.' });
      } else {
        const message = data.error ?? data.message ?? 'Falló la prueba SMTP';
        setSmtpStatus(`❌ ${message}`);
        setToast({ tone: 'error', message });
      }
    } catch {
      setSmtpStatus('❌ Error de conexión');
      setToast({ tone: 'error', message: 'No se pudo probar SMTP.' });
    } finally {
      setTestingSmtp(false);
    }
  };

  const savePayments = async () => {
    if (!modeOptions.includes(payments.mercadopago_mode as (typeof modeOptions)[number])) {
      setToast({ tone: 'error', message: 'Modo de MercadoPago inválido.' });
      return;
    }

    try {
      await putSetting('mercadopago_public_key', { value: payments.mercadopago_public_key, category: 'payments', encrypted: false });
      await putSetting('mercadopago_mode', { value: payments.mercadopago_mode, category: 'payments', encrypted: false });
      if (payments.mercadopago_access_token.trim()) {
        await putSetting('mercadopago_access_token', { value: payments.mercadopago_access_token, category: 'payments', encrypted: true });
      }
      if (payments.mercadopago_webhook_secret.trim()) {
        await putSetting('mercadopago_webhook_secret', { value: payments.mercadopago_webhook_secret, category: 'payments', encrypted: true });
      }
      setToast({ tone: 'success', message: 'MercadoPago actualizado.' });
      await load();
    } catch (saveError) {
      setToast({ tone: 'error', message: saveError instanceof Error ? saveError.message : 'Error al guardar MercadoPago.' });
    }
  };

  const saveEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.smtp_from_email)) {
      setToast({ tone: 'error', message: 'Email remitente inválido.' });
      return;
    }
    const port = Number(email.smtp_port);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      setToast({ tone: 'error', message: 'Puerto SMTP inválido.' });
      return;
    }
    if (!smtpEncryptionOptions.includes(email.smtp_encryption as (typeof smtpEncryptionOptions)[number])) {
      setToast({ tone: 'error', message: 'Tipo de encriptación SMTP inválido.' });
      return;
    }

    try {
      await putSetting('smtp_host', { value: email.smtp_host, category: 'email', encrypted: false });
      await putSetting('smtp_port', { value: `${port}`, category: 'email', encrypted: false });
      await putSetting('smtp_user', { value: email.smtp_user, category: 'email', encrypted: false });
      await putSetting('smtp_encryption', { value: email.smtp_encryption, category: 'email', encrypted: false });
      await putSetting('smtp_from_name', { value: email.smtp_from_name, category: 'email', encrypted: false });
      await putSetting('smtp_from_email', { value: email.smtp_from_email, category: 'email', encrypted: false });
      if (email.smtp_password.trim()) {
        await putSetting('smtp_password', { value: email.smtp_password, category: 'email', encrypted: true });
      }
      setToast({ tone: 'success', message: 'SMTP actualizado.' });
      await load();
    } catch (saveError) {
      setToast({ tone: 'error', message: saveError instanceof Error ? saveError.message : 'Error al guardar SMTP.' });
    }
  };

  const saveMaps = async () => {
    try {
      if (maps.google_maps_api_key.trim()) {
        await putSetting('google_maps_api_key', { value: maps.google_maps_api_key, category: 'maps', encrypted: true });
      }
      setToast({ tone: 'success', message: 'Google Maps actualizado.' });
      await load();
    } catch (saveError) {
      setToast({ tone: 'error', message: saveError instanceof Error ? saveError.message : 'Error al guardar Maps.' });
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Settings / Integrations</h1>
        <p className="text-sm text-slate-400">Gestioná credenciales e integraciones sin exponer secretos.</p>
      </section>

      {loading && <LoadingState message="Cargando integraciones..." />}
      {error && <ErrorState message={error} retry={() => void load()} />}
      {!loading && !error && rows.length === 0 && <EmptyState message="No hay configuraciones cargadas todavía." />}

      {!loading && !error && (
        <>
          <AdminCard title="MercadoPago" action={<div className="flex gap-2"><button className="rounded bg-cyan-600 px-3 py-1.5 text-sm" onClick={() => void savePayments()}>Guardar</button><button className="rounded bg-slate-700 px-3 py-1.5 text-sm" disabled={testingMp} onClick={() => void testMercadoPago()}>{testingMp ? 'Probando...' : 'Probar conexión'}</button></div>}>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Public key" value={payments.mercadopago_public_key} onChange={(e) => setPayments((prev) => ({ ...prev, mercadopago_public_key: e.target.value }))} />
              <select className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={payments.mercadopago_mode} onChange={(e) => setPayments((prev) => ({ ...prev, mercadopago_mode: e.target.value }))}>
                <option value="sandbox">sandbox</option>
                <option value="production">production</option>
              </select>
              <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder={encryptedExisting.mercadopago_access_token ? '•••••• (cargado, ingresar para reemplazar)' : 'Access token'} value={payments.mercadopago_access_token} onChange={(e) => setPayments((prev) => ({ ...prev, mercadopago_access_token: e.target.value }))} />
              <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder={encryptedExisting.mercadopago_webhook_secret ? '•••••• (cargado, ingresar para reemplazar)' : 'Webhook secret'} value={payments.mercadopago_webhook_secret} onChange={(e) => setPayments((prev) => ({ ...prev, mercadopago_webhook_secret: e.target.value }))} />
            </div>
            {mpStatus && <p className="mt-3 text-xs text-slate-300">{mpStatus}</p>}
          </AdminCard>

          <AdminCard title="SMTP" action={<div className="flex gap-2"><button className="rounded bg-cyan-600 px-3 py-1.5 text-sm" onClick={() => void saveEmail()}>Guardar</button><button className="rounded bg-slate-700 px-3 py-1.5 text-sm" disabled={testingSmtp} onClick={() => void testSmtp()}>{testingSmtp ? 'Enviando...' : 'Enviar email de prueba'}</button></div>}>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Host" value={email.smtp_host} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_host: e.target.value }))} />
              <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Port" value={email.smtp_port} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_port: e.target.value }))} />
              <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="User" value={email.smtp_user} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_user: e.target.value }))} />
              <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder={encryptedExisting.smtp_password ? '•••••• (cargado, ingresar para reemplazar)' : 'Password'} value={email.smtp_password} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_password: e.target.value }))} />
              <select className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={email.smtp_encryption} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_encryption: e.target.value }))}>
                {smtpEncryptionOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="From name" value={email.smtp_from_name} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_from_name: e.target.value }))} />
              <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm md:col-span-2" placeholder="From email" value={email.smtp_from_email} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_from_email: e.target.value }))} />
            </div>
            {smtpStatus && <p className="mt-3 text-xs text-slate-300">{smtpStatus}</p>}
          </AdminCard>

          <AdminCard title="Maps" action={<button className="rounded bg-cyan-600 px-3 py-1.5 text-sm" onClick={() => void saveMaps()}>Guardar</button>}>
            <input className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" placeholder={encryptedExisting.google_maps_api_key ? '•••••• (cargado, ingresar para reemplazar)' : 'Google Maps API key'} value={maps.google_maps_api_key} onChange={(e) => setMaps({ google_maps_api_key: e.target.value })} />
          </AdminCard>
        </>
      )}

      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
