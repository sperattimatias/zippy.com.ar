import { Injectable, Logger } from '@nestjs/common';

type TrackingState = 'none' | 'minor' | 'major';
type DeviationWindowState = { over300Since?: number; over700Since?: number; majorCount: number };

type FallbackEntry = { value: string; expiresAt: number };

@Injectable()
export class RedisStateService {
  private readonly logger = new Logger(RedisStateService.name);
  private readonly fallback = new Map<string, FallbackEntry>();
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
      this.logger.warn(`Redis unavailable, using in-memory fallback: ${(error as Error).message}`);
      return null;
    }
  }

  private setFallback(key: string, value: string, ttlMs: number) {
    this.fallback.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  private getFallback(key: string): string | null {
    const hit = this.fallback.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
      this.fallback.delete(key);
      return null;
    }
    return hit.value;
  }

  private delFallback(key: string) {
    this.fallback.delete(key);
  }

  /**
   * Distributed throttle lock for driver location updates.
   */
  async tryAcquireLocationThrottle(tripId: string, driverUserId: string, ttlSeconds = 2): Promise<boolean> {
    const key = `throttle:location:${tripId}:${driverUserId}`;
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch {
        // fallback below
      }
    }

    const existing = this.getFallback(key);
    if (existing) return false;
    this.setFallback(key, '1', ttlSeconds * 1000);
    return true;
  }

  async getTrackingState(tripId: string): Promise<TrackingState> {
    const key = `tracking:state:${tripId}`;
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        const value = await redis.get(key);
        if (value === 'minor' || value === 'major' || value === 'none') return value;
      } catch {
        // fallback below
      }
    }
    const value = this.getFallback(key);
    return value === 'minor' || value === 'major' || value === 'none' ? value : 'none';
  }

  async setTrackingState(tripId: string, state: TrackingState, ttlSeconds = 7200): Promise<void> {
    const key = `tracking:state:${tripId}`;
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        await redis.set(key, state, 'EX', ttlSeconds);
        return;
      } catch {
        // fallback below
      }
    }
    this.setFallback(key, state, ttlSeconds * 1000);
  }

  async getDeviationWindow(tripId: string): Promise<DeviationWindowState> {
    const key = `tracking:window:${tripId}`;
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(key);
        if (raw) return JSON.parse(raw) as DeviationWindowState;
      } catch {
        // fallback below
      }
    }
    const raw = this.getFallback(key);
    if (!raw) return { majorCount: 0 };
    try {
      return JSON.parse(raw) as DeviationWindowState;
    } catch {
      return { majorCount: 0 };
    }
  }

  async setDeviationWindow(tripId: string, state: DeviationWindowState, ttlSeconds = 1800): Promise<void> {
    const key = `tracking:window:${tripId}`;
    const payload = JSON.stringify(state);
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        await redis.set(key, payload, 'EX', ttlSeconds);
        return;
      } catch {
        // fallback below
      }
    }
    this.setFallback(key, payload, ttlSeconds * 1000);
  }

  async clearTripTrackingState(tripId: string): Promise<void> {
    const keys = [`tracking:state:${tripId}`, `tracking:window:${tripId}`];
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        await redis.del(...keys);
      } catch {
        // fallback below
      }
    }
    for (const key of keys) this.delFallback(key);
  }
}
