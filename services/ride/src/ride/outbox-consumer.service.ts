import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class OutboxConsumerService {
  private readonly logger = new Logger(OutboxConsumerService.name);
  private redisClient: any | null = null;
  private redisDisabled = false;
  private lastId = '$';

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
    } catch {
      this.redisDisabled = true;
      return null;
    }
  }

  @Cron('*/10 * * * * *')
  async consumeStub() {
    const redis = await this.getRedisClient();
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
