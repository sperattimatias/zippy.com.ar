import { Injectable, Logger } from '@nestjs/common';
import { GeoZone } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GeoZoneCacheService {
  private static readonly ACTIVE_ZONES_CACHE_KEY = 'geozones:active';
  private static readonly TTL_MS = 60_000;

  private readonly logger = new Logger(GeoZoneCacheService.name);
  private activeZonesCache: { key: string; expiresAt: number; value: GeoZone[] } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns active geozones from in-memory cache, refreshing from DB on TTL expiration.
   */
  async getActiveZones(): Promise<GeoZone[]> {
    const now = Date.now();
    if (this.activeZonesCache && this.activeZonesCache.key === GeoZoneCacheService.ACTIVE_ZONES_CACHE_KEY) {
      if (this.activeZonesCache.expiresAt > now) return this.activeZonesCache.value;
    }

    const zones = await this.prisma.geoZone.findMany({ where: { is_active: true } });
    this.activeZonesCache = {
      key: GeoZoneCacheService.ACTIVE_ZONES_CACHE_KEY,
      expiresAt: now + GeoZoneCacheService.TTL_MS,
      value: zones,
    };
    this.logger.debug(`active geozones cache refreshed count=${zones.length}`);
    return zones;
  }

  /**
   * Invalidates cached active geozones so subsequent reads fetch fresh data.
   */
  invalidateActiveZones() {
    this.activeZonesCache = null;
    this.logger.debug('active geozones cache invalidated');
  }
}
