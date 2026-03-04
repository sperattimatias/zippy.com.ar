import { GeoZoneType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeoZoneCacheService } from './geozone-cache.service';

describe('GeoZoneCacheService', () => {
  it('uses cache within TTL and refreshes after expiration', async () => {
    const prisma: any = {
      geoZone: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'z1', type: GeoZoneType.RED, is_active: true, polygon_json: [] }])
          .mockResolvedValueOnce([{ id: 'z2', type: GeoZoneType.CAUTION, is_active: true, polygon_json: [] }]),
      },
    };

    const service = new GeoZoneCacheService(prisma as PrismaService);

    const first = await service.getActiveZones();
    const second = await service.getActiveZones();
    (service as any).activeZonesCache.expiresAt = 0;
    const third = await service.getActiveZones();

    expect(first[0].id).toBe('z1');
    expect(second[0].id).toBe('z1');
    expect(third[0].id).toBe('z2');
    expect(prisma.geoZone.findMany).toHaveBeenCalledTimes(2);

  });

  it('invalidates cache explicitly', async () => {
    const prisma: any = {
      geoZone: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'z1', type: GeoZoneType.RED, is_active: true, polygon_json: [] }])
          .mockResolvedValueOnce([{ id: 'z3', type: GeoZoneType.SAFE, is_active: true, polygon_json: [] }]),
      },
    };

    const service = new GeoZoneCacheService(prisma as PrismaService);
    await service.getActiveZones();
    service.invalidateActiveZones();
    const refreshed = await service.getActiveZones();

    expect(refreshed[0].id).toBe('z3');
    expect(prisma.geoZone.findMany).toHaveBeenCalledTimes(2);
  });
});
