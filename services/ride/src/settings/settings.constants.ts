export type SystemSettingDefinition = {
  key: string;
  category: 'payments' | 'email' | 'maps';
  encrypted: boolean;
  fallbackEnv?: string;
};

export const SYSTEM_SETTING_DEFINITIONS: SystemSettingDefinition[] = [
  { key: 'mercadopago_public_key', category: 'payments', encrypted: false, fallbackEnv: 'MERCADOPAGO_PUBLIC_KEY' },
  { key: 'mercadopago_access_token', category: 'payments', encrypted: true, fallbackEnv: 'MERCADOPAGO_ACCESS_TOKEN' },
  { key: 'mercadopago_webhook_secret', category: 'payments', encrypted: true, fallbackEnv: 'MERCADOPAGO_WEBHOOK_SECRET' },
  { key: 'mercadopago_mode', category: 'payments', encrypted: false, fallbackEnv: 'MERCADOPAGO_MODE' },
  { key: 'smtp_host', category: 'email', encrypted: false, fallbackEnv: 'SMTP_HOST' },
  { key: 'smtp_port', category: 'email', encrypted: false, fallbackEnv: 'SMTP_PORT' },
  { key: 'smtp_user', category: 'email', encrypted: false, fallbackEnv: 'SMTP_USER' },
  { key: 'smtp_password', category: 'email', encrypted: true, fallbackEnv: 'SMTP_PASSWORD' },
  { key: 'smtp_encryption', category: 'email', encrypted: false, fallbackEnv: 'SMTP_ENCRYPTION' },
  { key: 'smtp_from_name', category: 'email', encrypted: false, fallbackEnv: 'SMTP_FROM_NAME' },
  { key: 'smtp_from_email', category: 'email', encrypted: false, fallbackEnv: 'SMTP_FROM_EMAIL' },
  { key: 'google_maps_api_key', category: 'maps', encrypted: true, fallbackEnv: 'GOOGLE_MAPS_API_KEY' },
];

export const SYSTEM_SETTINGS_BY_KEY = new Map(
  SYSTEM_SETTING_DEFINITIONS.map((definition) => [definition.key, definition]),
);
