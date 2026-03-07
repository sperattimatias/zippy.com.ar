import { createRideService, fraudMock } from './ride.service.spec.helpers';

describe('RideService admin live drivers', () => {
  const originalFreshness = process.env.DRIVER_PRESENCE_FRESHNESS_SECONDS;

  afterEach(() => {
    if (originalFreshness === undefined) delete process.env.DRIVER_PRESENCE_FRESHNESS_SECONDS;
    else process.env.DRIVER_PRESENCE_FRESHNESS_SECONDS = originalFreshness;
  });

  it('excludes online drivers without coordinates', async () => {
    process.env.DRIVER_PRESENCE_FRESHNESS_SECONDS = '60';
    const now = new Date();
    const prisma: any = {
      driverPresence: {
        findMany: jest.fn().mockResolvedValue([
          {
            driver_user_id: 'd1',
            is_online: true,
            last_lat: null,
            last_lng: -58.4,
            last_seen_at: now,
          },
        ]),
      },
      trip: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const geo: any = { getAliveDriverIds: jest.fn().mockResolvedValue(null) };
    const service = await createRideService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fraudMock() as any,
      undefined,
      undefined,
      geo,
    );

    const result = await service.getAdminLiveDrivers();

    expect(result.drivers).toEqual([]);
    expect(result.stats).toMatchObject({ onlineDrivers: 0, freshDrivers: 0, staleDrivers: 0 });
  });

  it('includes driver when online and fresh', async () => {
    process.env.DRIVER_PRESENCE_FRESHNESS_SECONDS = '60';
    const fresh = new Date(Date.now() - 5_000);
    const prisma: any = {
      driverPresence: {
        findMany: jest.fn().mockResolvedValue([
          {
            driver_user_id: 'd1',
            is_online: true,
            last_lat: -34.6,
            last_lng: -58.4,
            last_seen_at: fresh,
          },
        ]),
      },
      trip: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const geo: any = { getAliveDriverIds: jest.fn().mockResolvedValue(new Set(['d1'])) };
    const service = await createRideService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fraudMock() as any,
      undefined,
      undefined,
      geo,
    );

    const result = await service.getAdminLiveDrivers();

    expect(result.drivers).toHaveLength(1);
    expect(result.drivers[0]).toMatchObject({
      driverId: 'd1',
      isOnline: true,
      isFresh: true,
      operationalStatus: 'available',
      onTrip: false,
    });
    expect(result.stats).toMatchObject({
      onlineDrivers: 1,
      freshDrivers: 1,
      staleDrivers: 0,
      onTripDrivers: 0,
      idleDrivers: 1,
    });
  });

  it('excludes offline drivers at query level', async () => {
    process.env.DRIVER_PRESENCE_FRESHNESS_SECONDS = '60';
    const prisma: any = {
      driverPresence: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      trip: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const geo: any = { getAliveDriverIds: jest.fn().mockResolvedValue(new Set()) };
    const service = await createRideService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fraudMock() as any,
      undefined,
      undefined,
      geo,
    );

    await service.getAdminLiveDrivers();

    expect(prisma.driverPresence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ is_online: true }) }),
    );
  });

  it('excludes stale drivers from drivers payload and counts them in stats', async () => {
    process.env.DRIVER_PRESENCE_FRESHNESS_SECONDS = '60';
    const stale = new Date(Date.now() - 120_000);
    const prisma: any = {
      driverPresence: {
        findMany: jest.fn().mockResolvedValue([
          {
            driver_user_id: 'd1',
            is_online: true,
            last_lat: -34.6,
            last_lng: -58.4,
            last_seen_at: stale,
          },
        ]),
      },
      trip: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const geo: any = { getAliveDriverIds: jest.fn().mockResolvedValue(null) };
    const service = await createRideService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fraudMock() as any,
      undefined,
      undefined,
      geo,
    );

    const result = await service.getAdminLiveDrivers();

    expect(result.drivers).toEqual([]);
    expect(result.stats).toMatchObject({
      onlineDrivers: 1,
      freshDrivers: 0,
      staleDrivers: 1,
      onTripDrivers: 0,
      idleDrivers: 0,
    });
  });

  it('computes stats with on_trip and available split', async () => {
    process.env.DRIVER_PRESENCE_FRESHNESS_SECONDS = '60';
    const fresh = new Date(Date.now() - 10_000);
    const stale = new Date(Date.now() - 120_000);
    const prisma: any = {
      driverPresence: {
        findMany: jest.fn().mockResolvedValue([
          {
            driver_user_id: 'd1',
            is_online: true,
            last_lat: -34.6,
            last_lng: -58.4,
            last_seen_at: fresh,
          },
          {
            driver_user_id: 'd2',
            is_online: true,
            last_lat: -34.7,
            last_lng: -58.5,
            last_seen_at: fresh,
          },
          {
            driver_user_id: 'd3',
            is_online: true,
            last_lat: -34.8,
            last_lng: -58.6,
            last_seen_at: stale,
          },
        ]),
      },
      trip: {
        findMany: jest.fn().mockResolvedValue([{ driver_user_id: 'd1' }]),
      },
    };
    const geo: any = { getAliveDriverIds: jest.fn().mockResolvedValue(new Set(['d1', 'd2'])) };
    const service = await createRideService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fraudMock() as any,
      undefined,
      undefined,
      geo,
    );

    const result = await service.getAdminLiveDrivers();

    expect(result.stats).toMatchObject({
      onlineDrivers: 3,
      freshDrivers: 2,
      staleDrivers: 1,
      onTripDrivers: 1,
      idleDrivers: 1,
    });
    expect(result.drivers.find((d: any) => d.driverId === 'd1')).toMatchObject({
      operationalStatus: 'on_trip',
      onTrip: true,
    });
    expect(result.drivers.find((d: any) => d.driverId === 'd2')).toMatchObject({
      operationalStatus: 'available',
      onTrip: false,
    });
    expect(result.drivers.find((d: any) => d.driverId === 'd3')).toBeUndefined();
  });

  it('returns empty payload without errors', async () => {
    process.env.DRIVER_PRESENCE_FRESHNESS_SECONDS = '60';
    const prisma: any = {
      driverPresence: { findMany: jest.fn().mockResolvedValue([]) },
      trip: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const geo: any = { getAliveDriverIds: jest.fn().mockResolvedValue(new Set()) };
    const service = await createRideService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fraudMock() as any,
      undefined,
      undefined,
      geo,
    );

    const result = await service.getAdminLiveDrivers();

    expect(result.drivers).toEqual([]);
    expect(result.stats).toEqual({
      onlineDrivers: 0,
      freshDrivers: 0,
      staleDrivers: 0,
      onTripDrivers: 0,
      idleDrivers: 0,
    });
  });
});
