import { Injectable, Logger } from '@nestjs/common';

type NearbyQuery = {
  lat: number;
  lng: number;
  radiusMeters: number;
  limit: number;
};

@Injectable()
export class DriverGeoIndexService {
  private readonly logger = new Logger(DriverGeoIndexService.name);
  private redisClient: any | null = null;
  private redisDisabled = false;

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
      this.logger.warn(`Driver GEO Redis unavailable: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Redis GEO driver index keys:
   * - GEO set: drivers:geo
   * - Alive key: drivers:geo:alive:<driverUserId> (TTL 45s)
   */
  async upsert(driverUserId: string, lat: number, lng: number): Promise<void> {
    const redis = await this.getRedisClient();
    if (!redis) return;

    await redis.geoadd('drivers:geo', lng, lat, driverUserId);
    await redis.set(`drivers:geo:alive:${driverUserId}`, '1', 'EX', 45);
  }

  async findNearby(input: NearbyQuery): Promise<string[]> {
    const redis = await this.getRedisClient();
    if (!redis) return [];

    const ids = (await redis.georadius(
      'drivers:geo',
      input.lng,
      input.lat,
      input.radiusMeters,
      'm',
      'COUNT',
      input.limit,
      'ASC',
    )) as string[];

    if (!ids.length) return [];

    const aliveKeys = ids.map((id) => `drivers:geo:alive:${id}`);
    const aliveValues = (await redis.mget(aliveKeys)) as Array<string | null>;
    return ids.filter((_, idx) => aliveValues[idx] === '1');
  }
}
