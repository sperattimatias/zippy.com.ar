import { BadRequestException } from '@nestjs/common';
import { TripStatus } from '@prisma/client';
import { RideService } from './ride.service';

describe('RideService', () => {
  it('auto-match selects best bid when bidding expires', async () => {
    const prisma: any = {
      trip: {
        findMany: jest.fn().mockResolvedValue([{ id: 't1', status: 'BIDDING' }]),
      },
      tripBid: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'b1', driver_user_id: 'd1', price_offer: 1200, eta_to_pickup_minutes: 9 },
          { id: 'b2', driver_user_id: 'd2', price_offer: 1000, eta_to_pickup_minutes: 1 },
        ]),
      },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (fn: any) => {
        const trx = {
          trip: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          tripBid: { updateMany: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) },
        };
        return fn(trx);
      }),
    };
    const ws: any = { emitTrip: jest.fn() };
    const service = new RideService(prisma, ws);

    await service.autoMatchExpiredBiddingTrips();
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(ws.emitTrip).toHaveBeenCalledWith('t1', 'trip.matched', expect.any(Object));
  });

  it('auto-match concurrent worker skip when claim fails', async () => {
    const prisma: any = {
      trip: { findMany: jest.fn().mockResolvedValue([{ id: 't1', status: 'BIDDING' }]) },
      tripBid: { findMany: jest.fn().mockResolvedValue([{ id: 'b1', driver_user_id: 'd1', price_offer: 1000 }]) },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (fn: any) => {
        const trx = {
          trip: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
          tripBid: { updateMany: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) },
        };
        return fn(trx);
      }),
    };
    const ws: any = { emitTrip: jest.fn() };
    const service = new RideService(prisma, ws);

    await service.autoMatchExpiredBiddingTrips();
    expect(prisma.tripEvent.create).not.toHaveBeenCalled();
    expect(ws.emitTrip).not.toHaveBeenCalled();
  });

  it('point-in-polygon works for inside and outside points', () => {
    const service = new RideService({} as any, {} as any);
    const polygon = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
      { lat: 0, lng: 0 },
    ];
    expect((service as any).pointInPolygon({ lat: 0.5, lng: 0.5 }, polygon)).toBe(true);
    expect((service as any).pointInPolygon({ lat: 2, lng: 2 }, polygon)).toBe(false);
  });

  it('distance-to-polyline is near zero for point on the route', () => {
    const service = new RideService({} as any, {} as any);
    const line = [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }];
    const d = (service as any).distanceToPolylineMeters({ lat: 0, lng: 0.5 }, line);
    expect(d).toBeLessThan(30);
  });

  it('otp verify increments attempts on failure', async () => {
    const prisma: any = {
      trip: { findUnique: jest.fn().mockResolvedValue({ id: 't1', driver_user_id: 'd1', status: 'OTP_PENDING' }) },
      tripOtp: {
        findUnique: jest.fn().mockResolvedValue({ trip_id: 't1', otp_hash: 'hash', expires_at: new Date(Date.now() + 60000), attempts: 0 }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new RideService(prisma, { emitTrip: jest.fn() } as any);
    await expect(service.verifyOtp('t1', 'd1', { otp: '000000' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tripOtp.update).toHaveBeenCalled();
  });

  it('tracking-lost job creates major alert for stale location', async () => {
    const prisma: any = {
      trip: {
        findMany: jest.fn().mockResolvedValue([
          { id: 't1', status: 'IN_PROGRESS', safety_state: { last_driver_location_at: new Date(Date.now() - 50_000) } },
        ]),
      },
      safetyAlert: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
      tripSafetyState: {
        upsert: jest.fn().mockResolvedValue({ safety_score: 85 }),
        findUnique: jest.fn().mockResolvedValue({ safety_score: 85 }),
      },
    };
    const ws: any = { emitTrip: jest.fn(), emitSosAlert: jest.fn() };
    const service = new RideService(prisma, ws);
    await service.scanTrackingLostTrips();
    expect(prisma.safetyAlert.create).toHaveBeenCalled();
  });

  it('major deviation sustained creates route deviation alert', async () => {
    const prisma: any = {
      trip: { findUnique: jest.fn().mockResolvedValue({ id: 't1', driver_user_id: 'd1', status: 'IN_PROGRESS' }) },
      tripLocation: { create: jest.fn().mockResolvedValue({ created_at: new Date() }) },
      tripSafetyState: {
        upsert: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ trip_id: 't1', last_zone_type: null }),
        update: jest.fn().mockResolvedValue({}),
      },
      geoZone: { findMany: jest.fn().mockResolvedValue([]) },
      tripRouteBaseline: {
        findUnique: jest.fn().mockResolvedValue({
          polyline_json: [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.01 }],
        }),
      },
      safetyAlert: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const ws: any = { emitTrip: jest.fn(), emitSosAlert: jest.fn() };
    const service = new RideService(prisma, ws);
    jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(21_000).mockReturnValue(21_000);

    await service.trackLocation('t1', 'd1', { lat: 0.02, lng: 0.02 });
    await service.trackLocation('t1', 'd1', { lat: 0.02, lng: 0.02 });

    expect(prisma.safetyAlert.create).toHaveBeenCalled();
    (Date.now as jest.Mock).mockRestore();
  });

  it('invalid FSM transition fails', async () => {
    const prisma: any = { trip: { findUnique: jest.fn().mockResolvedValue({ id: 't1', driver_user_id: 'd1', status: TripStatus.MATCHED }) } };
    const service = new RideService(prisma, {} as any);
    await expect(service.completeTrip('t1', 'd1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
