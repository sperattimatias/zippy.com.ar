import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { GeoZoneCacheService } from './geozone-cache.service';

describe('GeoZoneCacheService', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('returns cached active zones within ttl and refreshes after ttl', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    const prisma = {
      geoZone: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'z1' }])
          .mockResolvedValueOnce([{ id: 'z2' }]),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [GeoZoneCacheService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = moduleRef.get(GeoZoneCacheService);

    await expect(service.getActiveZones()).resolves.toEqual([{ id: 'z1' }]);
    await expect(service.getActiveZones()).resolves.toEqual([{ id: 'z1' }]);
    expect(prisma.geoZone.findMany).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date('2025-01-01T00:01:01.000Z'));

    await expect(service.getActiveZones()).resolves.toEqual([{ id: 'z2' }]);
    expect(prisma.geoZone.findMany).toHaveBeenCalledTimes(2);
  });

  it('invalidates cache explicitly on demand', async () => {
    const prisma = {
      geoZone: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'z1' }])
          .mockResolvedValueOnce([{ id: 'z2' }]),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [GeoZoneCacheService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = moduleRef.get(GeoZoneCacheService);

    await service.getActiveZones();
    service.invalidateActiveZones();
    await service.getActiveZones();

    expect(prisma.geoZone.findMany).toHaveBeenCalledTimes(2);
  });
});
