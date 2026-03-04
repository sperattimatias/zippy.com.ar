import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { REDIS_CLIENT, RedisClient } from '../infra/redis/redis.types';

@Injectable()
export class OutboxConsumerService {
  private readonly logger = new Logger(OutboxConsumerService.name);
  private lastId = '$';

  constructor(@Optional() @Inject(REDIS_CLIENT) private readonly redisClient: RedisClient | null = null) {}

  @Cron('*/10 * * * * *')
  async consumeStub() {
    const redis = this.redisClient;
    if (!redis) return;

    const rows = (await redis.xread('COUNT', 20, 'BLOCK', 1, 'STREAMS', 'stream:trip-events', this.lastId)) as any;
    if (!rows?.length) return;

    for (const [, events] of rows) {
      for (const [id, fields] of events) {
        this.lastId = id;
        this.logger.debug(`trip stream event id=${id} fields=${JSON.stringify(fields)}`);
      }
    }
  }
}
