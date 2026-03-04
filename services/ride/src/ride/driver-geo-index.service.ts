import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { REDIS_CLIENT, RedisClient } from '../infra/redis/redis.types';

type NearbyQuery = {
  lat: number;
  lng: number;
  radiusMeters: number;
  limit: number;
};

@Injectable()
export class DriverGeoIndexService {
  private readonly logger = new Logger(DriverGeoIndexService.name);

  constructor(@Optional() @Inject(REDIS_CLIENT) private readonly redisClient: RedisClient | null = null) {}

  /**
   * Redis GEO driver index keys:
   * - GEO set: drivers:geo
   * - Alive key: drivers:geo:alive:<driverUserId> (TTL 45s)
   */
  async upsert(driverUserId: string, lat: number, lng: number): Promise<void> {
    const redis = this.redisClient;
    if (!redis) return;

    try {
      await redis.geoadd('drivers:geo', lng, lat, driverUserId);
      await redis.set(`drivers:geo:alive:${driverUserId}`, '1', 'EX', 45);
    } catch (error) {
      this.logger.warn(`Driver GEO upsert failed: ${(error as Error).message}`);
    }
  }

  async findNearby(input: NearbyQuery): Promise<string[]> {
    const redis = this.redisClient;
    if (!redis) return [];

    try {
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
    } catch (error) {
      this.logger.warn(`Driver GEO lookup failed: ${(error as Error).message}`);
      throw error;
    }
  }
}
