import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT, RedisClient } from '../infra/redis/redis.types';

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private readonly instanceId: string;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redisClient: RedisClient | null = null,
    instanceId?: string,
  ) {
    this.instanceId = instanceId ?? process.env.INSTANCE_ID ?? randomUUID();
  }

  async claimPendingBatch(limit = 50, leaseSeconds = 60, now = new Date()) {
    const staleBefore = new Date(now.getTime() - leaseSeconds * 1000);

    const candidates = await this.prisma.outboxEvent.findMany({
      where: {
        published_at: null,
        OR: [{ locked_at: null }, { locked_at: { lt: staleBefore } }],
      },
      orderBy: { created_at: 'asc' },
      take: limit,
      select: { id: true },
    });

    if (!candidates.length) return [];

    const candidateIds = candidates.map((candidate) => candidate.id);
    const lockTime = new Date(now);

    const claim = await this.prisma.outboxEvent.updateMany({
      where: {
        id: { in: candidateIds },
        published_at: null,
        OR: [{ locked_at: null }, { locked_at: { lt: staleBefore } }],
      },
      data: {
        locked_at: lockTime,
        locked_by: this.instanceId,
      },
    });

    if (claim.count === 0) return [];

    return this.prisma.outboxEvent.findMany({
      where: {
        id: { in: candidateIds },
        locked_by: this.instanceId,
        locked_at: { gte: lockTime },
        published_at: null,
      },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Publishes OutboxEvent rows to Redis Stream `stream:trip-events`
   * with fields: event_type, aggregate_id, payload.
   */
  async publishPendingBatch(limit = 50) {
    const redis = this.redisClient;
    if (!redis) return;

    const claimed = await this.claimPendingBatch(limit);
    for (const ev of claimed) {
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

        await this.prisma.outboxEvent.updateMany({
          where: {
            id: ev.id,
            published_at: null,
            locked_by: this.instanceId,
          },
          data: {
            published_at: new Date(),
            locked_at: null,
            locked_by: null,
          },
        });
      } catch (error) {
        await this.prisma.outboxEvent.updateMany({
          where: {
            id: ev.id,
            published_at: null,
            locked_by: this.instanceId,
          },
          data: {
            attempts: { increment: 1 },
            locked_at: null,
            locked_by: null,
          },
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
