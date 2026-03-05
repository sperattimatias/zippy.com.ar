import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSettingValue, encryptSettingValue } from './settings.crypto';
import { SYSTEM_SETTING_DEFINITIONS, SYSTEM_SETTINGS_BY_KEY } from './settings.constants';
import * as net from 'net';
import * as tls from 'tls';

type SetOptions = {
  category?: string;
  encrypted?: boolean;
  updatedBy?: string;
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private get masterKey() {
    return process.env.SETTINGS_MASTER_KEY ?? '';
  }

  private resolveMeta(key: string, options?: SetOptions) {
    const defaults = SYSTEM_SETTINGS_BY_KEY.get(key);
    return {
      category: options?.category ?? defaults?.category ?? 'general',
      encrypted: options?.encrypted ?? defaults?.encrypted ?? false,
    };
  }

  async set(key: string, value: string, options: SetOptions = {}) {
    const { category, encrypted } = this.resolveMeta(key, options);
    const valueToStore = encrypted ? encryptSettingValue(value, this.masterKey) : value;

    const record = await this.prisma.systemSetting.upsert({
      where: { key },
      update: {
        category,
        value: valueToStore,
        is_encrypted: encrypted,
        updated_by: options.updatedBy ?? null,
      },
      create: {
        key,
        category,
        value: valueToStore,
        is_encrypted: encrypted,
        updated_by: options.updatedBy ?? null,
      },
    });

    return {
      key: record.key,
      category: record.category,
      is_encrypted: record.is_encrypted,
      updated_at: record.updated_at,
      updated_by: record.updated_by,
      value: record.is_encrypted ? null : record.value,
      masked_value: record.is_encrypted ? '********' : null,
    };
  }

  async get(key: string) {
    const record = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (record) {
      return {
        key: record.key,
        category: record.category,
        value: record.is_encrypted
          ? decryptSettingValue(record.value, this.masterKey)
          : record.value,
        is_encrypted: record.is_encrypted,
        source: 'db' as const,
      };
    }

    const fallback = SYSTEM_SETTINGS_BY_KEY.get(key)?.fallbackEnv;
    if (fallback && process.env[fallback] != null) {
      return {
        key,
        category: SYSTEM_SETTINGS_BY_KEY.get(key)?.category ?? 'general',
        value: process.env[fallback] ?? null,
        is_encrypted: SYSTEM_SETTINGS_BY_KEY.get(key)?.encrypted ?? false,
        source: 'env' as const,
      };
    }

    return null;
  }

  async list(category?: string) {
    const records = await this.prisma.systemSetting.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    const dbKeys = new Set(records.map((record) => record.key));
    const fallbackRecords = SYSTEM_SETTING_DEFINITIONS.filter(
      (definition) => (!category || definition.category === category) && !dbKeys.has(definition.key),
    )
      .filter((definition) => !!definition.fallbackEnv && process.env[definition.fallbackEnv] != null)
      .map((definition) => ({
        key: definition.key,
        category: definition.category,
        is_encrypted: definition.encrypted,
        updated_at: null,
        updated_by: null,
        value: definition.encrypted ? null : process.env[definition.fallbackEnv!],
        masked_value: definition.encrypted ? '********' : null,
        source: 'env' as const,
      }));

    const dbRecords = records.map((record) => ({
      key: record.key,
      category: record.category,
      is_encrypted: record.is_encrypted,
      updated_at: record.updated_at,
      updated_by: record.updated_by,
      value: record.is_encrypted ? null : record.value,
      masked_value: record.is_encrypted ? '********' : null,
      source: 'db' as const,
    }));

    return [...dbRecords, ...fallbackRecords];
  }

  async testMercadoPagoConnection() {
    const token = (await this.get('mercadopago_access_token'))?.value;
    if (!token) return { ok: false, error: 'mercadopago_access_token no configurado' };

    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) return { ok: true };

      const payload = await response.json().catch(() => ({}));
      return { ok: false, error: payload?.message ?? `MercadoPago respondió ${response.status}` };
    } catch {
      return { ok: false, error: 'No se pudo conectar con MercadoPago' };
    }
  }

  async testSmtpConnection(toEmail: string) {
    if (!toEmail) throw new BadRequestException('toEmail es requerido');

    const host = (await this.get('smtp_host'))?.value;
    const portValue = (await this.get('smtp_port'))?.value;
    const user = (await this.get('smtp_user'))?.value;
    const password = (await this.get('smtp_password'))?.value;
    const encryption = ((await this.get('smtp_encryption'))?.value ?? 'tls').toLowerCase();
    const fromName = (await this.get('smtp_from_name'))?.value ?? 'Zippy';
    const fromEmail = (await this.get('smtp_from_email'))?.value;

    if (!host || !portValue || !fromEmail) {
      return { ok: false, error: 'Configuración SMTP incompleta' };
    }

    const port = Number(portValue);
    if (!Number.isFinite(port) || port <= 0) {
      return { ok: false, error: 'Puerto SMTP inválido' };
    }

    const secure = encryption === 'ssl' || encryption === 'tls';

    const socket = await this.openSmtpSocket(host, port, secure);
    try {
      await this.readCode(socket, [220]);
      await this.writeLine(socket, `EHLO zippy.local`);
      await this.readCode(socket, [250], true);

      if (user && password) {
        await this.writeLine(socket, 'AUTH LOGIN');
        await this.readCode(socket, [334]);
        await this.writeLine(socket, Buffer.from(user).toString('base64'));
        await this.readCode(socket, [334]);
        await this.writeLine(socket, Buffer.from(password).toString('base64'));
        await this.readCode(socket, [235]);
      }

      await this.writeLine(socket, `MAIL FROM:<${fromEmail}>`);
      await this.readCode(socket, [250]);
      await this.writeLine(socket, `RCPT TO:<${toEmail}>`);
      await this.readCode(socket, [250, 251]);
      await this.writeLine(socket, 'DATA');
      await this.readCode(socket, [354]);

      const subject = 'Prueba de conexión SMTP';
      const lines = [
        `From: ${fromName} <${fromEmail}>`,
        `To: <${toEmail}>`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Este es un email de prueba de Zippy Admin.',
        `Fecha: ${new Date().toISOString()}`,
        '.',
      ];
      for (const line of lines) {
        await this.writeLine(socket, line);
      }

      await this.readCode(socket, [250]);
      await this.writeLine(socket, 'QUIT');
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo enviar email de prueba' };
    } finally {
      socket.end();
    }
  }

  private openSmtpSocket(host: string, port: number, secure: boolean) {
    return new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
      const onError = () => reject(new Error('smtp connection error'));
      const socket = secure
        ? tls.connect({ host, port, servername: host, rejectUnauthorized: false }, () => resolve(socket))
        : net.connect({ host, port }, () => resolve(socket));
      socket.setTimeout(10000, () => {
        socket.destroy();
        reject(new Error('smtp timeout'));
      });
      socket.once('error', onError);
    });
  }

  private writeLine(socket: net.Socket | tls.TLSSocket, line: string) {
    return new Promise<void>((resolve, reject) => {
      socket.write(`${line}\r\n`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private readCode(socket: net.Socket | tls.TLSSocket, expected: number[], multiLine = false) {
    return new Promise<string>((resolve, reject) => {
      let buffer = '';
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split(/\r?\n/).filter(Boolean);
        if (lines.length === 0) return;

        const last = lines[lines.length - 1];
        if (multiLine) {
          const done = /^\d{3} /.test(last);
          if (!done) return;
        } else if (!/^\d{3}[\s-]/.test(last)) {
          return;
        }

        const code = Number(last.slice(0, 3));
        cleanup();
        if (!expected.includes(code)) {
          reject(new Error(`smtp unexpected code ${code}`));
          return;
        }
        resolve(last);
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        socket.off('data', onData);
        socket.off('error', onError);
      };

      socket.on('data', onData);
      socket.on('error', onError);
    });
  }
}
