'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminCard, EmptyState, ErrorState, LoadingState, Toast } from '../../../../components/admin/ui';
import { FormField } from '../../../../components/forms/form-field';
import { MaskedSecretInput } from '../../../../components/forms/masked-secret-input';
import { ConfirmDialog } from '../../../../components/forms/confirm-dialog';
import { FORM_LABELS } from '../../../../lib/admin-form-labels';

type Category = 'payments' | 'email' | 'maps';
type SettingRow = { key: string; category: Category | string; value: string | null; masked_value: string | null; is_encrypted: boolean };
type ToastState = { tone: 'success' | 'error'; message: string } | null;

const modeOptions = ['sandbox', 'production'] as const;
const smtpEncryptionOptions = ['none', 'ssl', 'tls', 'starttls'] as const;

export default function IntegrationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [rows, setRows] = useState<SettingRow[]>([]);

  const [payments, setPayments] = useState({ mercadopago_public_key: '', mercadopago_access_token: '', mercadopago_webhook_secret: '', mercadopago_mode: 'sandbox' });
  const [email, setEmail] = useState({ smtp_host: '', smtp_port: '587', smtp_user: '', smtp_password: '', smtp_encryption: 'tls', smtp_from_name: '', smtp_from_email: '' });
  const [maps, setMaps] = useState({ google_maps_api_key: '' });
  const [smtpToEmail, setSmtpToEmail] = useState('');

  const [saving, setSaving] = useState<{ payments: boolean; email: boolean; maps: boolean }>({ payments: false, email: false, maps: false });
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingMp, setTestingMp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [mpStatus, setMpStatus] = useState('');
  const [smtpStatus, setSmtpStatus] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
      const [paymentsRows, emailRows, mapsRows] = await Promise.all([loadCategory('payments'), loadCategory('email'), loadCategory('maps')]);
      const merged = [...paymentsRows, ...emailRows, ...mapsRows];
      setRows(merged);
      const getPlain = (key: string) => merged.find((item) => item.key === key)?.value ?? '';

      setPayments({ mercadopago_public_key: getPlain('mercadopago_public_key'), mercadopago_access_token: '', mercadopago_webhook_secret: '', mercadopago_mode: (getPlain('mercadopago_mode') || 'sandbox').toLowerCase() });
      setEmail({ smtp_host: getPlain('smtp_host'), smtp_port: getPlain('smtp_port') || '587', smtp_user: getPlain('smtp_user'), smtp_password: '', smtp_encryption: (getPlain('smtp_encryption') || 'tls').toLowerCase(), smtp_from_name: getPlain('smtp_from_name'), smtp_from_email: getPlain('smtp_from_email') });
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
    const response = await fetch(`/api/admin/settings/${key}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message ?? `No se pudo guardar ${key}`);
    }
  };

  const validatePayments = () => {
    const next: Record<string, string> = {};
    if (!modeOptions.includes(payments.mercadopago_mode as (typeof modeOptions)[number])) next.mercadopago_mode = 'Modo inválido';
    if (!payments.mercadopago_public_key.trim()) next.mercadopago_public_key = 'La public key es obligatoria';
    setFieldErrors((prev) => ({ ...prev, ...next }));
    return Object.keys(next).length === 0;
  };

  const validateEmail = () => {
    const next: Record<string, string> = {};
    const port = Number(email.smtp_port);
    if (!email.smtp_host.trim()) next.smtp_host = 'Host requerido';
    if (!Number.isFinite(port) || port < 1 || port > 65535) next.smtp_port = 'Puerto inválido';
    if (!email.smtp_from_email.includes('@')) next.smtp_from_email = 'Email inválido';
    if (!smtpEncryptionOptions.includes(email.smtp_encryption as (typeof smtpEncryptionOptions)[number])) next.smtp_encryption = 'Encriptación inválida';
    setFieldErrors((prev) => ({ ...prev, ...next }));
    return Object.keys(next).length === 0;
  };

  const savePayments = async () => {
    if (!validatePayments()) return setToast({ tone: 'error', message: 'Revisá los errores del formulario de pagos.' });
    setSaving((prev) => ({ ...prev, payments: true }));
    try {
      await putSetting('mercadopago_public_key', { value: payments.mercadopago_public_key, category: 'payments', encrypted: false });
      await putSetting('mercadopago_mode', { value: payments.mercadopago_mode, category: 'payments', encrypted: false });
      if (payments.mercadopago_access_token.trim()) await putSetting('mercadopago_access_token', { value: payments.mercadopago_access_token, category: 'payments', encrypted: true });
      if (payments.mercadopago_webhook_secret.trim()) await putSetting('mercadopago_webhook_secret', { value: payments.mercadopago_webhook_secret, category: 'payments', encrypted: true });
      setToast({ tone: 'success', message: 'Configuración de pagos guardada.' });
      await load();
    } catch (saveError) {
      setToast({ tone: 'error', message: saveError instanceof Error ? saveError.message : 'No se pudo guardar pagos.' });
    } finally {
      setSaving((prev) => ({ ...prev, payments: false }));
    }
  };

  const saveEmail = async () => {
    if (!validateEmail()) return setToast({ tone: 'error', message: 'Revisá los errores del formulario SMTP.' });
    setSaving((prev) => ({ ...prev, email: true }));
    try {
      await putSetting('smtp_host', { value: email.smtp_host, category: 'email', encrypted: false });
      await putSetting('smtp_port', { value: `${Number(email.smtp_port)}`, category: 'email', encrypted: false });
      await putSetting('smtp_user', { value: email.smtp_user, category: 'email', encrypted: false });
      await putSetting('smtp_encryption', { value: email.smtp_encryption, category: 'email', encrypted: false });
      await putSetting('smtp_from_name', { value: email.smtp_from_name, category: 'email', encrypted: false });
      await putSetting('smtp_from_email', { value: email.smtp_from_email, category: 'email', encrypted: false });
      if (email.smtp_password.trim()) await putSetting('smtp_password', { value: email.smtp_password, category: 'email', encrypted: true });
      setToast({ tone: 'success', message: 'Configuración de email guardada.' });
      await load();
    } catch (saveError) {
      setToast({ tone: 'error', message: saveError instanceof Error ? saveError.message : 'No se pudo guardar email.' });
    } finally {
      setSaving((prev) => ({ ...prev, email: false }));
    }
  };

  const saveMaps = async () => {
    setSaving((prev) => ({ ...prev, maps: true }));
    try {
      if (maps.google_maps_api_key.trim()) {
        await putSetting('google_maps_api_key', { value: maps.google_maps_api_key, category: 'maps', encrypted: true });
        setToast({ tone: 'success', message: 'API key de mapas guardada.' });
        await load();
      } else {
        setToast({ tone: 'error', message: 'Ingresá una API key para reemplazar la existente.' });
      }
    } catch (saveError) {
      setToast({ tone: 'error', message: saveError instanceof Error ? saveError.message : 'No se pudo guardar maps.' });
    } finally {
      setSaving((prev) => ({ ...prev, maps: false }));
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
    if (!smtpToEmail.includes('@')) return setToast({ tone: 'error', message: 'Ingresá un email válido para la prueba SMTP.' });
    setTestingSmtp(true);
    setSmtpStatus('Enviando email de prueba...');
    try {
      const res = await fetch('/api/admin/settings/test/smtp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toEmail: smtpToEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSmtpStatus('✅ Email de prueba enviado');
        setToast({ tone: 'success', message: `SMTP ok. Email enviado a ${smtpToEmail}.` });
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
      setTestDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading && <LoadingState message="Cargando integraciones..." />}
      {error && <ErrorState message={error} retry={() => void load()} />}
      {!loading && !error && rows.length === 0 && <EmptyState message="No hay configuraciones guardadas todavía." />}

      {!loading && !error && (
        <>
          <AdminCard
            title={FORM_LABELS.sections.payments}
            action={
              <div className="flex gap-2">
                <button className="rounded-md bg-slate-800 px-3 py-1.5 text-xs" onClick={() => void testMercadoPago()} disabled={testingMp}>
                  {testingMp ? 'Probando...' : FORM_LABELS.actions.testMp}
                </button>
                <button className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs" onClick={() => void savePayments()} disabled={saving.payments}>
                  {saving.payments ? 'Guardando...' : FORM_LABELS.actions.savePayments}
                </button>
              </div>
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Public key" error={fieldErrors.mercadopago_public_key}>
                <input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={payments.mercadopago_public_key} onChange={(e) => setPayments((prev) => ({ ...prev, mercadopago_public_key: e.target.value }))} />
              </FormField>
              <FormField label="Mode" error={fieldErrors.mercadopago_mode}>
                <select className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={payments.mercadopago_mode} onChange={(e) => setPayments((prev) => ({ ...prev, mercadopago_mode: e.target.value }))}>
                  {modeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </FormField>
              <FormField label="Access token" description="Nunca se muestra el valor real; solo podés reemplazarlo.">
                <MaskedSecretInput hasStored={encryptedExisting.mercadopago_access_token} value={payments.mercadopago_access_token} onChange={(value) => setPayments((prev) => ({ ...prev, mercadopago_access_token: value }))} placeholder="Nuevo access token" />
              </FormField>
              <FormField label="Webhook secret" description="Nunca se muestra el valor real; solo podés reemplazarlo.">
                <MaskedSecretInput hasStored={encryptedExisting.mercadopago_webhook_secret} value={payments.mercadopago_webhook_secret} onChange={(value) => setPayments((prev) => ({ ...prev, mercadopago_webhook_secret: value }))} placeholder="Nuevo webhook secret" />
              </FormField>
            </div>
            {mpStatus && <p className="mt-3 text-xs text-slate-300">{mpStatus}</p>}
          </AdminCard>

          <AdminCard
            title={FORM_LABELS.sections.email}
            action={
              <div className="flex gap-2">
                <button className="rounded-md bg-slate-800 px-3 py-1.5 text-xs" onClick={() => setTestDialogOpen(true)} disabled={testingSmtp}>
                  {FORM_LABELS.actions.testSmtp}
                </button>
                <button className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs" onClick={() => void saveEmail()} disabled={saving.email}>
                  {saving.email ? 'Guardando...' : FORM_LABELS.actions.saveEmail}
                </button>
              </div>
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Host" error={fieldErrors.smtp_host}><input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={email.smtp_host} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_host: e.target.value }))} /></FormField>
              <FormField label="Port" error={fieldErrors.smtp_port}><input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={email.smtp_port} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_port: e.target.value }))} /></FormField>
              <FormField label="User"><input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={email.smtp_user} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_user: e.target.value }))} /></FormField>
              <FormField label="Password" description="Nunca se muestra el valor real; solo podés reemplazarlo.">
                <MaskedSecretInput hasStored={encryptedExisting.smtp_password} value={email.smtp_password} onChange={(value) => setEmail((prev) => ({ ...prev, smtp_password: value }))} placeholder="Nuevo password" />
              </FormField>
              <FormField label="Encryption" error={fieldErrors.smtp_encryption}>
                <select className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={email.smtp_encryption} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_encryption: e.target.value }))}>
                  {smtpEncryptionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </FormField>
              <FormField label="From name"><input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={email.smtp_from_name} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_from_name: e.target.value }))} /></FormField>
              <FormField label="From email" error={fieldErrors.smtp_from_email}><input className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm md:col-span-2" value={email.smtp_from_email} onChange={(e) => setEmail((prev) => ({ ...prev, smtp_from_email: e.target.value }))} /></FormField>
            </div>
            {smtpStatus && <p className="mt-3 text-xs text-slate-300">{smtpStatus}</p>}
          </AdminCard>

          <AdminCard title={FORM_LABELS.sections.maps} action={<button className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs" onClick={() => void saveMaps()} disabled={saving.maps}>{saving.maps ? 'Guardando...' : FORM_LABELS.actions.saveMaps}</button>}>
            <FormField label="Google Maps API key" description="Nunca se muestra el valor real; solo podés reemplazarlo.">
              <MaskedSecretInput hasStored={encryptedExisting.google_maps_api_key} value={maps.google_maps_api_key} onChange={(value) => setMaps({ google_maps_api_key: value })} placeholder="Nueva API key" />
            </FormField>
          </AdminCard>
        </>
      )}

      <ConfirmDialog
        open={testDialogOpen}
        title="Probar SMTP"
        description="Ingresá un destinatario para enviar email de prueba"
        confirmLabel={FORM_LABELS.actions.confirm}
        loading={testingSmtp}
        onClose={() => setTestDialogOpen(false)}
        onConfirm={() => void testSmtp()}
      >
        <FormField label="Email destinatario">
          <input className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm" value={smtpToEmail} onChange={(e) => setSmtpToEmail(e.target.value)} />
        </FormField>
      </ConfirmDialog>

      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
