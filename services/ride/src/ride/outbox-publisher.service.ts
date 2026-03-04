import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private redisClient: any | null = null;
  private redisDisabled = false;

  constructor(private readonly prisma: PrismaService) {}

  private async getRedisClient(): Promise<any | null> {
    if (this.redisDisabled) return null;
    if (this.redisClient) return this.redisClient;
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.redisDisabled = true;
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Redis = require('ioredis');
      const client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
      await client.connect();
      this.redisClient = client;
      return client;
    } catch (error) {
      this.redisDisabled = true;
      this.logger.warn(`Outbox publisher Redis unavailable: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Publishes OutboxEvent rows to Redis Stream `stream:trip-events`
   * with fields: event_type, aggregate_id, payload.
   */
  async publishPendingBatch(limit = 50) {
    const redis = await this.getRedisClient();
    if (!redis) return;

    const pending = await this.prisma.outboxEvent.findMany({
      where: { published_at: null },
      orderBy: { created_at: 'asc' },
      take: limit,
    });

    for (const ev of pending) {
      try {
        await redis.xadd(
          'stream:trip-events',
          '*',
          'event_type',
          ev.event_type,
          'aggregate_id',
          ev.aggregate_id,
          'payload',
          JSON.stringify(ev.payload_json),
        );
        await this.prisma.outboxEvent.update({
          where: { id: ev.id },
          data: { published_at: new Date() },
        });
      } catch (error) {
        await this.prisma.outboxEvent.update({
          where: { id: ev.id },
          data: { attempts: { increment: 1 } },
        });
        this.logger.warn(`outbox publish failed id=${ev.id} err=${(error as Error).message}`);
      }
    }
  }

  @Cron('*/5 * * * * *')
  async publishPendingCron() {
    await this.publishPendingBatch();
  }
}
