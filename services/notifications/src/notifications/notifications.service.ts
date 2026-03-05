import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(query: { channel?: string; search?: string }) {
    return this.prisma.notificationTemplate.findMany({
      where: {
        ...(query.channel ? { channel: query.channel } : {}),
        ...(query.search
          ? { OR: [{ key: { contains: query.search, mode: 'insensitive' } }, { title: { contains: query.search, mode: 'insensitive' } }] }
          : {}),
      },
      orderBy: { updated_at: 'desc' },
    });
  }

  async upsertTemplate(dto: { key: string; channel: string; title: string; body: string; is_active?: boolean }) {
    return this.prisma.notificationTemplate.upsert({
      where: { key: dto.key },
      create: { ...dto, is_active: dto.is_active ?? true },
      update: { channel: dto.channel, title: dto.title, body: dto.body, ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}) },
    });
  }

  async listSettings() {
    const defaults = ['ride_created', 'ride_cancelled', 'payment_failed'];
    const rows = await this.prisma.notificationSetting.findMany({ orderBy: { event_key: 'asc' } });
    const map = new Map(rows.map((r) => [r.event_key, r]));
    return defaults.map((event_key) => map.get(event_key) ?? { event_key, enabled: true, updated_by: null, updated_at: null });
  }

  async setSetting(eventKey: string, enabled: boolean, updatedBy?: string) {
    return this.prisma.notificationSetting.upsert({
      where: { event_key: eventKey },
      create: { event_key: eventKey, enabled, updated_by: updatedBy },
      update: { enabled, updated_by: updatedBy },
    });
  }

  async listLogs(query: { status?: string; event_key?: string }) {
    return this.prisma.notificationDeliveryLog.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.event_key ? { event_key: query.event_key } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }
}
