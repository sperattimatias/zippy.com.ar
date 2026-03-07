import type { Prisma } from '@prisma/client';

import type { PrismaService } from '../prisma/prisma.service';

type AdminAuditFilter = {
  from?: string;
  to?: string;
  action?: string;
  entityType?: string;
  adminId?: string;
};

function sanitizeAuditPayload(payload: unknown): Prisma.InputJsonValue | undefined {
  if (payload === undefined) return undefined;

  const redact = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (/(token|secret|password|authorization|key)/i.test(k)) out[k] = '[REDACTED]';
        else out[k] = redact(v);
      }
      return out;
    }
    return value;
  };

  return redact(payload) as Prisma.InputJsonValue;
}

export async function logAdminAuditEntry(
  prisma: PrismaService,
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  payload?: unknown,
) {
  return prisma.adminAuditLog.create({
    data: {
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      payload: sanitizeAuditPayload(payload),
    },
  });
}

export async function listAdminAuditEntries(prisma: PrismaService, filter: AdminAuditFilter) {
  return prisma.adminAuditLog.findMany({
    where: {
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.entityType ? { entity_type: filter.entityType } : {}),
      ...(filter.adminId ? { admin_id: filter.adminId } : {}),
      ...(filter.from || filter.to
        ? {
            created_at: {
              ...(filter.from ? { gte: new Date(filter.from) } : {}),
              ...(filter.to ? { lte: new Date(filter.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { created_at: 'desc' },
    take: 200,
  });
}

export async function listAdminAuditEntriesByEntity(
  prisma: PrismaService,
  entityType: string,
  entityId: string,
) {
  return prisma.adminAuditLog.findMany({
    where: { entity_type: entityType, entity_id: entityId },
    orderBy: { created_at: 'desc' },
    take: 200,
  });
}
