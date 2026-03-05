import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSettingValue, encryptSettingValue } from './settings.crypto';
import { SYSTEM_SETTING_DEFINITIONS, SYSTEM_SETTINGS_BY_KEY } from './settings.constants';

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
}
