import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import {
  ActorType,
  FraudSeverity,
  FraudSignalType,
  RestrictionStatus,
  TripBidStatus,
  TripStatus,
} from '@prisma/client';
import { RideService } from './ride.service';

const fraudMock = () => ({
  captureFingerprint: jest.fn(),
  applySignal: jest.fn(),
  runPeriodicDetections: jest.fn(),
  listCases: jest.fn(),
  getCase: jest.fn(),
  assignCase: jest.fn(),
  resolveCase: jest.fn(),
  dismissCase: jest.fn(),
  userRisk: jest.fn(),
  createHoldIfAbsent: jest.fn(),
  releaseHold: jest.fn(),
});

describe('RideService antifraud hardening', () => {
  it('presence online blocked by score restriction', async () => {
    const service = new RideService(
      {} as any,
      {} as any,
      {
        ensureDriverCanGoOnline: jest.fn().mockRejectedValue(new ForbiddenException('blocked')),
        getOrCreateUserScore: jest.fn(),
      } as any,
      {} as any,
      {} as any,
      fraudMock() as any,
    );
    await expect(
      service.presenceOnline('d1', { lat: 0, lng: 0, category: 'AUTO' as any }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('createBid captures fingerprint and requires mp account', async () => {
    const fraud = fraudMock();
    const prisma: any = {
      trip: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 't1', status: TripStatus.BIDDING, price_base: 1000 }),
      },
      driverPresence: {
        findUnique: jest.fn().mockResolvedValue({ is_online: true, last_seen_at: new Date() }),
      },
      externalDriverProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new RideService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fraud as any,
    );
    await expect(
      service.createBid('t1', 'd1', { price_offer: 1000 }, { ip: '1.1.1.1', ua: 'ua' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(fraud.captureFingerprint).toHaveBeenCalledWith(
      'd1',
      ActorType.DRIVER,
      expect.any(Object),
    );
  });



  it('createBid upserts when the same driver bids twice on one trip', async () => {
    const fraud = fraudMock();
    const ws: any = { emitTrip: jest.fn() };
    const bids = new Map<string, any>();

    const prisma: any = {
      trip: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 't1', status: TripStatus.BIDDING, price_base: 1000 }),
      },
      driverPresence: {
        findUnique: jest.fn().mockResolvedValue({ is_online: true, last_seen_at: new Date() }),
      },
      externalDriverProfile: { findUnique: jest.fn().mockResolvedValue({ mp_account_id: 'mp_1' }) },
      tripBid: {
        upsert: jest.fn().mockImplementation(({ where, update, create }: any) => {
          const key = `${where.trip_id_driver_user_id.trip_id}:${where.trip_id_driver_user_id.driver_user_id}`;
          const existing = bids.get(key);
          if (existing) {
            const next = { ...existing, ...update, updated_at: new Date() };
            bids.set(key, next);
            return Promise.resolve(next);
          }
          const created = {
            id: 'bid-1',
            status: 'PENDING',
            created_at: new Date(),
            updated_at: new Date(),
            ...create,
          };
          bids.set(key, created);
          return Promise.resolve(created);
        }),
      },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
    };

    const service = new RideService(prisma, ws, {} as any, {} as any, {} as any, fraud as any);

    const first = await service.createBid('t1', 'd1', { price_offer: 900, eta_to_pickup_minutes: 6 }, {});
    const second = await service.createBid('t1', 'd1', { price_offer: 1100, eta_to_pickup_minutes: 4 }, {});

    expect(first.id).toBe(second.id);
    expect(second.price_offer).toBe(1100);
    expect(second.eta_to_pickup_minutes).toBe(4);
    expect(prisma.tripBid.upsert).toHaveBeenCalledTimes(2);
  });

  it('createBid keeps exactly one bid row per (trip, driver)', async () => {
    const bids = new Map<string, any>();
    const prisma: any = {
      trip: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 't1', status: TripStatus.BIDDING, price_base: 1000 }),
      },
      driverPresence: {
        findUnique: jest.fn().mockResolvedValue({ is_online: true, last_seen_at: new Date() }),
      },
      externalDriverProfile: { findUnique: jest.fn().mockResolvedValue({ mp_account_id: 'mp_1' }) },
      tripBid: {
        upsert: jest.fn().mockImplementation(({ where, update, create }: any) => {
          const key = `${where.trip_id_driver_user_id.trip_id}:${where.trip_id_driver_user_id.driver_user_id}`;
          const existing = bids.get(key);
          if (existing) {
            const next = { ...existing, ...update, updated_at: new Date() };
            bids.set(key, next);
            return Promise.resolve(next);
          }
          const created = { id: `bid-${bids.size + 1}`, ...create, created_at: new Date(), updated_at: new Date() };
          bids.set(key, created);
          return Promise.resolve(created);
        }),
      },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new RideService(
      prisma,
      { emitTrip: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      fraudMock() as any,
    );

    await service.createBid('t1', 'd1', { price_offer: 900, eta_to_pickup_minutes: 5 }, {});
    await service.createBid('t1', 'd1', { price_offer: 920, eta_to_pickup_minutes: 4 }, {});

    expect(bids.size).toBe(1);
    expect(Array.from(bids.values())[0].price_offer).toBe(920);
  });



  it('createBid maps Prisma uniqueness races to BadRequestException', async () => {
    const prisma: any = {
      trip: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 't1', status: TripStatus.BIDDING, price_base: 1000 }),
      },
      driverPresence: {
        findUnique: jest.fn().mockResolvedValue({ is_online: true, last_seen_at: new Date() }),
      },
      externalDriverProfile: { findUnique: jest.fn().mockResolvedValue({ mp_account_id: 'mp_1' }) },
      tripBid: {
        upsert: jest.fn().mockRejectedValue({ code: 'P2002' }),
      },
    };
    const service = new RideService(
      prisma,
      { emitTrip: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      fraudMock() as any,
    );

    await expect(service.createBid('t1', 'd1', { price_offer: 1000 }, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('repeated pair with low-distance clustered trips creates HIGH signal', async () => {
    const fraud = fraudMock();
    const prisma: any = {
      trip: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          status: TripStatus.IN_PROGRESS,
          driver_user_id: 'd1',
          passenger_user_id: 'p1',
          distance_km: 1.2,
        }),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue(
          Array.from({ length: 7 }).map(() => ({
            origin_lat: 0,
            origin_lng: 0,
            dest_lat: 0.001,
            dest_lng: 0.001,
            distance_km: 1.0,
            price_final: 1000,
          })),
        ),
        count: jest.fn().mockResolvedValue(7),
      },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
      appConfig: {
        findUnique: jest.fn().mockResolvedValue({
          value_json: {
            repeated_pair_24h: 4,
            repeated_pair_7d: 12,
            repeated_pair_min_trips_for_pattern: 6,
            repeated_pair_requires_low_distance: true,
            repeated_pair_low_distance_km: 2,
            repeated_pair_same_origin_radius_m: 250,
            repeated_pair_same_dest_radius_m: 250,
          },
        }),
      },
    };
    const scoreService: any = {
      applyScoreEvent: jest.fn(),
      applyRecoveryOnTripCompletion: jest.fn(),
    };
    const service = new RideService(
      prisma,
      { emitTrip: jest.fn() } as any,
      scoreService,
      {} as any,
      { computeDriverLevel: jest.fn(), computePassengerLevel: jest.fn() } as any,
      fraud as any,
    );
    await service.completeTrip('t1', 'd1');
    expect(fraud.applySignal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: FraudSignalType.REPEATED_PAIR_TRIPS,
        severity: FraudSeverity.HIGH,
        score_delta: 25,
      }),
    );
  });



  it('acceptBid allows only one winner under concurrent requests', async () => {
    const tripState: any = {
      id: 't1',
      passenger_user_id: 'p1',
      status: TripStatus.BIDDING,
      driver_user_id: null,
      price_final: null,
      matched_at: null,
    };
    const bids = {
      b1: {
        id: 'b1',
        trip_id: 't1',
        driver_user_id: 'd1',
        price_offer: 1000,
        status: TripBidStatus.PENDING,
      },
      b2: {
        id: 'b2',
        trip_id: 't1',
        driver_user_id: 'd2',
        price_offer: 980,
        status: TripBidStatus.PENDING,
      },
    } as Record<string, any>;

    const prisma: any = {
      $transaction: async (cb: any) => cb(prisma),
      trip: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.id !== 't1') return null;
          return { ...tripState };
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          if (where.id !== 't1') return { count: 0 };
          if (tripState.status !== where.status) return { count: 0 };
          Object.assign(tripState, data);
          return { count: 1 };
        }),
      },
      tripBid: {
        findUnique: jest.fn(async ({ where }: any) => {
          const bid = bids[where.id];
          return bid ? { ...bid } : null;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          for (const bid of Object.values(bids)) {
            if (bid.trip_id === where.trip_id && bid.id !== where.id?.not && bid.status === where.status) {
              Object.assign(bid, data);
            }
          }
          return { count: 1 };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          Object.assign(bids[where.id], data);
          return { ...bids[where.id] };
        }),
      },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
    };

    const ws: any = { emitTrip: jest.fn(), emitToDriver: jest.fn() };
    const service = new RideService(
      prisma,
      ws,
      {} as any,
      {} as any,
      {} as any,
      fraudMock() as any,
    );

    const [r1, r2] = await Promise.allSettled([
      service.acceptBid('t1', 'p1', { bid_id: 'b1' }),
      service.acceptBid('t1', 'p1', { bid_id: 'b2' }),
    ]);

    const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
    const rejected = [r1, r2].filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    expect(tripState.status).toBe(TripStatus.MATCHED);
    expect(Object.values(bids).filter((b: any) => b.status === TripBidStatus.ACCEPTED)).toHaveLength(1);
    expect(ws.emitTrip).toHaveBeenCalledTimes(1);
    expect(ws.emitToDriver).toHaveBeenCalledTimes(1);
  });

  it('invalid FSM transition fails', async () => {
    const prisma: any = {
      trip: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 't1', driver_user_id: 'd1', status: TripStatus.MATCHED }),
      },
    };
    const service = new RideService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fraudMock() as any,
    );
    await expect(service.completeTrip('t1', 'd1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('matching excludes blocked drivers and orders by score', async () => {
    const ws: any = { emitTrip: jest.fn(), emitToDriver: jest.fn(), emitToUser: jest.fn() };
    const prisma: any = {
      trip: {
        create: jest.fn().mockResolvedValue({
          id: 't1',
          status: 'BIDDING',
          origin_address: 'A',
          dest_address: 'B',
          price_base: 1000,
          bidding_expires_at: new Date(),
        }),
      },
      tripRouteBaseline: { create: jest.fn().mockResolvedValue({}) },
      tripSafetyState: { create: jest.fn().mockResolvedValue({}) },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
      driverPresence: {
        findMany: jest.fn().mockResolvedValue([
          { driver_user_id: 'dBlocked', last_seen_at: new Date(), last_lat: 0, last_lng: 0 },
          { driver_user_id: 'dHigh', last_seen_at: new Date(), last_lat: 0, last_lng: 0 },
          { driver_user_id: 'dLow', last_seen_at: new Date(), last_lat: 0, last_lng: 0 },
        ]),
      },
      userScore: {
        findMany: jest.fn().mockResolvedValue([
          { user_id: 'dBlocked', score: 95, status: RestrictionStatus.BLOCKED },
          { user_id: 'dHigh', score: 99, status: RestrictionStatus.NONE },
          { user_id: 'dLow', score: 20, status: RestrictionStatus.WARNING },
        ]),
      },
      appConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      premiumZone: { findMany: jest.fn().mockResolvedValue([]) },
      scoreEvent: { groupBy: jest.fn().mockResolvedValue([]) },
      userHold: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new RideService(
      prisma,
      ws,
      {
        getOrCreateUserScore: jest
          .fn()
          .mockResolvedValue({ score: 80, status: RestrictionStatus.NONE }),
      } as any,
      {
        evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }),
        getPremiumContext: jest
          .fn()
          .mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }),
        isPeakNow: jest.fn().mockResolvedValue(false),
        pointInPolygon: jest.fn().mockReturnValue(false),
      } as any,
      {} as any,
      fraudMock() as any,
    );
    await service.requestTrip(
      'p1',
      {
        origin_lat: 0,
        origin_lng: 0,
        origin_address: 'A',
        dest_lat: 1,
        dest_lng: 1,
        dest_address: 'B',
        category: 'AUTO' as any,
      },
      {},
    );
    expect(ws.emitToDriver.mock.calls[0][0]).toBe('dHigh');
    expect(ws.emitToDriver.mock.calls.some((c: any[]) => c[0] === 'dBlocked')).toBe(false);
    expect(prisma.scoreEvent.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.premiumZone.findMany).toHaveBeenCalledTimes(1);
  });
});
