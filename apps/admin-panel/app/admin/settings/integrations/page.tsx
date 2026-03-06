'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AdminCard, EmptyState, ErrorState, LoadingState } from '../../../../components/admin/ui';
import { ConfirmDialog } from '../../../../components/forms/confirm-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../../components/forms/form';
import { SecretInput } from '../../../../components/forms/secret-input';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { toast } from '../../../../components/ui/sonner';
import { FORM_LABELS } from '../../../../lib/admin-form-labels';

type Category = 'payments' | 'email' | 'maps';
type SettingRow = { key: string; category: Category | string; value: string | null; masked_value: string | null; is_encrypted: boolean };

const paymentsSchema = z.object({
  mercadopago_public_key: z.string().trim().min(1, 'La public key es obligatoria'),
  mercadopago_access_token: z.string().optional(),
  mercadopago_webhook_secret: z.string().optional(),
  mercadopago_mode: z.enum(['sandbox', 'live']),
});

const emailSchema = z.object({
  smtp_host: z.string().trim().min(1, 'Host requerido'),
  smtp_port: z.coerce.number().int().min(1, 'Puerto inválido').max(65535, 'Puerto inválido'),
  smtp_user: z.string().optional(),
  smtp_password: z.string().optional(),
  smtp_encryption: z.enum(['none', 'tls', 'ssl']),
  smtp_from_name: z.string().optional(),
  smtp_from_email: z.string().email('Email inválido'),
});

const mapsSchema = z.object({
  google_maps_api_key: z.string().optional(),
});

type PaymentsValues = z.infer<typeof paymentsSchema>;
type EmailValues = z.infer<typeof emailSchema>;
type MapsValues = z.infer<typeof mapsSchema>;

export default function IntegrationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [saving, setSaving] = useState<{ payments: boolean; email: boolean; maps: boolean }>({ payments: false, email: false, maps: false });
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingMp, setTestingMp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpToEmail, setSmtpToEmail] = useState('');

  const paymentsForm = useForm<PaymentsValues>({
    resolver: zodResolver(paymentsSchema),
    defaultValues: {
      mercadopago_public_key: '',
      mercadopago_access_token: '',
      mercadopago_webhook_secret: '',
      mercadopago_mode: 'sandbox',
    },
  });

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_password: '',
      smtp_encryption: 'tls',
      smtp_from_name: '',
      smtp_from_email: '',
    },
  });

  const mapsForm = useForm<MapsValues>({
    resolver: zodResolver(mapsSchema),
    defaultValues: { google_maps_api_key: '' },
  });

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

      const currentMode = (getPlain('mercadopago_mode') || 'sandbox').toLowerCase();
      paymentsForm.reset({
        mercadopago_public_key: getPlain('mercadopago_public_key'),
        mercadopago_access_token: '',
        mercadopago_webhook_secret: '',
        mercadopago_mode: currentMode === 'production' ? 'live' : (currentMode as 'sandbox' | 'live'),
      });

      const currentEncryption = (getPlain('smtp_encryption') || 'tls').toLowerCase();
      emailForm.reset({
        smtp_host: getPlain('smtp_host'),
        smtp_port: Number(getPlain('smtp_port') || '587'),
        smtp_user: getPlain('smtp_user'),
        smtp_password: '',
        smtp_encryption: (currentEncryption === 'starttls' ? 'tls' : currentEncryption) as 'none' | 'tls' | 'ssl',
        smtp_from_name: getPlain('smtp_from_name'),
        smtp_from_email: getPlain('smtp_from_email'),
      });

      mapsForm.reset({ google_maps_api_key: '' });
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

  const savePayments = async (values: PaymentsValues) => {
    setSaving((prev) => ({ ...prev, payments: true }));
    try {
      await putSetting('mercadopago_public_key', { value: values.mercadopago_public_key.trim(), category: 'payments' });
      await putSetting('mercadopago_mode', { value: values.mercadopago_mode, category: 'payments' });
      if (values.mercadopago_access_token?.trim()) {
        await putSetting('mercadopago_access_token', { value: values.mercadopago_access_token.trim(), category: 'payments', encrypted: true });
      }
      if (values.mercadopago_webhook_secret?.trim()) {
        await putSetting('mercadopago_webhook_secret', { value: values.mercadopago_webhook_secret.trim(), category: 'payments', encrypted: true });
      }
      toast('Configuración de pagos guardada.', 'success');
      await load();
    } catch (saveError) {
      toast(saveError instanceof Error ? saveError.message : 'No se pudo guardar pagos.', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, payments: false }));
    }
  };

  const saveEmail = async (values: EmailValues) => {
    setSaving((prev) => ({ ...prev, email: true }));
    try {
      await putSetting('smtp_host', { value: values.smtp_host.trim(), category: 'email' });
      await putSetting('smtp_port', { value: String(values.smtp_port), category: 'email' });
      await putSetting('smtp_user', { value: values.smtp_user?.trim() ?? '', category: 'email' });
      await putSetting('smtp_encryption', { value: values.smtp_encryption, category: 'email' });
      await putSetting('smtp_from_name', { value: values.smtp_from_name?.trim() ?? '', category: 'email' });
      await putSetting('smtp_from_email', { value: values.smtp_from_email.trim(), category: 'email' });
      if (values.smtp_password?.trim()) {
        await putSetting('smtp_password', { value: values.smtp_password.trim(), category: 'email', encrypted: true });
      }
      toast('Configuración de email guardada.', 'success');
      await load();
    } catch (saveError) {
      toast(saveError instanceof Error ? saveError.message : 'No se pudo guardar email.', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, email: false }));
    }
  };

  const saveMaps = async (values: MapsValues) => {
    setSaving((prev) => ({ ...prev, maps: true }));
    try {
      if (!values.google_maps_api_key?.trim() && encryptedExisting.google_maps_api_key) {
        toast('Ingresá una API key para reemplazar la existente.', 'error');
        return;
      }
      if (values.google_maps_api_key?.trim()) {
        await putSetting('google_maps_api_key', {
          value: values.google_maps_api_key.trim(),
          category: 'maps',
          encrypted: true,
        });
        toast('API key de mapas guardada.', 'success');
        await load();
      }
    } catch (saveError) {
      toast(saveError instanceof Error ? saveError.message : 'No se pudo guardar maps.', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, maps: false }));
    }
  };

  const testMercadoPago = async () => {
    setTestingMp(true);
    try {
      const res = await fetch('/api/admin/settings/test/mercadopago', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message ?? 'Error probando MercadoPago.');
      toast('MercadoPago conectado correctamente.', 'success');
      setTestDialogOpen(false);
    } catch (testError) {
      toast(testError instanceof Error ? testError.message : 'No se pudo probar MercadoPago.', 'error');
    } finally {
      setTestingMp(false);
    }
  };

  const testSmtp = async () => {
    if (!smtpToEmail.includes('@')) {
      toast('Ingresá un email válido para la prueba SMTP.', 'error');
      return;
    }
    setTestingSmtp(true);
    try {
      const res = await fetch('/api/admin/settings/test/smtp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to_email: smtpToEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message ?? 'Error probando SMTP.');
      toast(`SMTP ok. Email enviado a ${smtpToEmail}.`, 'success');
      setTestDialogOpen(false);
    } catch (testError) {
      toast(testError instanceof Error ? testError.message : 'No se pudo probar SMTP.', 'error');
    } finally {
      setTestingSmtp(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading && <LoadingState message="Cargando configuraciones..." />}
      {error && <ErrorState message={error} retry={() => void load()} />}

      {!loading && !error && rows.length === 0 && <EmptyState message="No hay configuraciones cargadas" />}

      {!loading && !error && rows.length > 0 && (
        <>
          <AdminCard title={FORM_LABELS.sections.payments} action={<Button onClick={() => void paymentsForm.handleSubmit(savePayments)()} disabled={saving.payments}>{saving.payments ? 'Guardando...' : FORM_LABELS.actions.savePayments}</Button>}>
            <Form {...paymentsForm}>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={paymentsForm.handleSubmit(savePayments)}>
                <FormField control={paymentsForm.control} name="mercadopago_public_key" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Public key</FormLabel>
                    <FormControl><Input {...field} disabled={saving.payments} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={paymentsForm.control} name="mercadopago_mode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modo</FormLabel>
                    <FormControl>
                      <Select value={field.value} onChange={field.onChange} disabled={saving.payments}>
                        <option value="sandbox">sandbox</option>
                        <option value="live">live</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={paymentsForm.control} name="mercadopago_access_token" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access token</FormLabel>
                    <FormControl>
                      <SecretInput
                        hasStored={encryptedExisting.mercadopago_access_token}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Nuevo access token"
                        disabled={saving.payments}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={paymentsForm.control} name="mercadopago_webhook_secret" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook secret</FormLabel>
                    <FormControl>
                      <SecretInput
                        hasStored={encryptedExisting.mercadopago_webhook_secret}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Nuevo webhook secret"
                        disabled={saving.payments}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </form>
            </Form>
          </AdminCard>

          <AdminCard title={FORM_LABELS.sections.email} action={<Button onClick={() => void emailForm.handleSubmit(saveEmail)()} disabled={saving.email}>{saving.email ? 'Guardando...' : FORM_LABELS.actions.saveEmail}</Button>}>
            <Form {...emailForm}>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={emailForm.handleSubmit(saveEmail)}>
                <FormField control={emailForm.control} name="smtp_host" render={({ field }) => (
                  <FormItem><FormLabel>SMTP host</FormLabel><FormControl><Input {...field} disabled={saving.email} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={emailForm.control} name="smtp_port" render={({ field }) => (
                  <FormItem><FormLabel>SMTP port</FormLabel><FormControl><Input type="number" value={field.value} onChange={field.onChange} disabled={saving.email} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={emailForm.control} name="smtp_encryption" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Encriptación</FormLabel>
                    <FormControl>
                      <Select value={field.value} onChange={field.onChange} disabled={saving.email}>
                        <option value="none">none</option>
                        <option value="tls">tls</option>
                        <option value="ssl">ssl</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={emailForm.control} name="smtp_user" render={({ field }) => (
                  <FormItem><FormLabel>SMTP user</FormLabel><FormControl><Input {...field} disabled={saving.email} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={emailForm.control} name="smtp_password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP password</FormLabel>
                    <FormControl>
                      <SecretInput
                        hasStored={encryptedExisting.smtp_password}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Nuevo SMTP password"
                        disabled={saving.email}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={emailForm.control} name="smtp_from_name" render={({ field }) => (
                  <FormItem><FormLabel>From name</FormLabel><FormControl><Input {...field} disabled={saving.email} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={emailForm.control} name="smtp_from_email" render={({ field }) => (
                  <FormItem><FormLabel>From email</FormLabel><FormControl><Input {...field} disabled={saving.email} /></FormControl><FormMessage /></FormItem>
                )} />
              </form>
            </Form>
          </AdminCard>

          <AdminCard title={FORM_LABELS.sections.maps} action={<Button onClick={() => void mapsForm.handleSubmit(saveMaps)()} disabled={saving.maps}>{saving.maps ? 'Guardando...' : FORM_LABELS.actions.saveMaps}</Button>}>
            <Form {...mapsForm}>
              <form className="grid gap-3" onSubmit={mapsForm.handleSubmit(saveMaps)}>
                <FormField control={mapsForm.control} name="google_maps_api_key" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Maps API key</FormLabel>
                    <FormControl>
                      <SecretInput
                        hasStored={encryptedExisting.google_maps_api_key}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Nueva Google Maps API key"
                        disabled={saving.maps}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </form>
            </Form>
          </AdminCard>

          <AdminCard title="Pruebas">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setTestDialogOpen(true)}>{FORM_LABELS.actions.testMp}</Button>
            </div>
          </AdminCard>
        </>
      )}

      <ConfirmDialog
        open={testDialogOpen}
        title="Probar integraciones"
        description="Ejecuta pruebas de conectividad sin exponer secretos."
        confirmLabel="Cerrar"
        destructive={false}
        onClose={() => setTestDialogOpen(false)}
        onConfirm={() => setTestDialogOpen(false)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-300">MercadoPago</p>
            <Button type="button" onClick={() => void testMercadoPago()} disabled={testingMp}>{testingMp ? 'Probando...' : FORM_LABELS.actions.testMp}</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-300">SMTP</p>
            <Input value={smtpToEmail} onChange={(event) => setSmtpToEmail(event.target.value)} placeholder="destino@example.com" />
            <Button type="button" onClick={() => void testSmtp()} disabled={testingSmtp}>{testingSmtp ? 'Probando...' : FORM_LABELS.actions.testSmtp}</Button>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
