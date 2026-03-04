import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT, RedisClient } from '../infra/redis/redis.types';

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redisClient: RedisClient | null = null,
  ) {}

  /**
   * Publishes OutboxEvent rows to Redis Stream `stream:trip-events`
   * with fields: event_type, aggregate_id, payload.
   */
  async publishPendingBatch(limit = 50) {
    const redis = this.redisClient;
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
