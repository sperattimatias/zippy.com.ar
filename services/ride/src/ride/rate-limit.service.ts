import { Inject, Injectable, Optional } from '@nestjs/common';
import { REDIS_CLIENT, RedisClient } from '../infra/redis/redis.types';

type FallbackCounter = { count: number; expiresAt: number };

@Injectable()
export class RateLimitService {
  private readonly fallback = new Map<string, FallbackCounter>();

  constructor(@Optional() @Inject(REDIS_CLIENT) private readonly redisClient: RedisClient | null = null) {}

  private getFallbackCount(key: string): number {
    const hit = this.fallback.get(key);
    if (!hit) return 0;
    if (hit.expiresAt <= Date.now()) {
      this.fallback.delete(key);
      return 0;
    }
    return hit.count;
  }

  private setFallbackCount(key: string, count: number, windowSeconds: number) {
    this.fallback.set(key, { count, expiresAt: Date.now() + windowSeconds * 1000 });
  }

  async isAllowed(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
    const redis = this.redisClient;
    if (redis) {
      try {
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, windowSeconds);
        return count <= maxRequests;
      } catch {
        // fallback below
      }
    }

    const current = this.getFallbackCount(key);
    const next = current + 1;
    this.setFallbackCount(key, next, windowSeconds);
    return next <= maxRequests;
  }
}
