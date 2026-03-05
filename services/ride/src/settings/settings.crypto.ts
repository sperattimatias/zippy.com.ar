import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';

function decodeMasterKey(rawKey: string) {
  const trimmed = rawKey.trim();
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  try {
    const base64 = Buffer.from(trimmed, 'base64');
    if (base64.length === 32) return base64;
  } catch {
    // noop
  }

  if (trimmed.length === 32) {
    return Buffer.from(trimmed, 'utf8');
  }

  throw new Error('SETTINGS_MASTER_KEY must be 32 bytes (hex/base64/plain).');
}

export function encryptSettingValue(value: string, masterKey: string) {
  const iv = randomBytes(12);
  const key = decodeMasterKey(masterKey);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSettingValue(value: string, masterKey: string) {
  if (!value.startsWith('enc:')) return value;

  const [, version, ivBase64, tagBase64, payloadBase64] = value.split(':');
  if (version !== VERSION || !ivBase64 || !tagBase64 || !payloadBase64) {
    throw new Error('Invalid encrypted setting payload format.');
  }

  const key = decodeMasterKey(masterKey);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadBase64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
