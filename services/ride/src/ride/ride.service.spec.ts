import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
    const service = new RideService(prisma, ws, { applyScoreEvent: jest.fn(), ensureDriverCanGoOnline: jest.fn(), listScores: jest.fn(), getUserScoreDetail: jest.fn(), createManualRestriction: jest.fn(), liftRestriction: jest.fn(), adjustScore: jest.fn() } as any, { evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }), getPremiumContext: jest.fn().mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }), isPeakNow: jest.fn().mockResolvedValue(false), getMyBadge: jest.fn(), getConfigByKey: jest.fn(), putConfig: jest.fn() } as any, { computeDriverLevel: jest.fn(, computePassengerLevel: jest.fn(, getActiveCommissionBps: jest.fn( } as any, { captureFingerprint: jest.fn(), applySignal: jest.fn(), runPeriodicDetections: jest.fn(), listCases: jest.fn(), getCase: jest.fn(), assignCase: jest.fn(), resolveCase: jest.fn(), dismissCase: jest.fn(), userRisk: jest.fn(), createHoldIfAbsent: jest.fn(), releaseHold: jest.fn() } as any);

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
    const service = new RideService(prisma, ws, { applyScoreEvent: jest.fn(), ensureDriverCanGoOnline: jest.fn(), listScores: jest.fn(), getUserScoreDetail: jest.fn(), createManualRestriction: jest.fn(), liftRestriction: jest.fn(), adjustScore: jest.fn() } as any, { evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }), getPremiumContext: jest.fn().mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }), isPeakNow: jest.fn().mockResolvedValue(false), getMyBadge: jest.fn(), getConfigByKey: jest.fn(), putConfig: jest.fn() } as any, { computeDriverLevel: jest.fn(, computePassengerLevel: jest.fn(, getActiveCommissionBps: jest.fn( } as any, { captureFingerprint: jest.fn(), applySignal: jest.fn(), runPeriodicDetections: jest.fn(), listCases: jest.fn(), getCase: jest.fn(), assignCase: jest.fn(), resolveCase: jest.fn(), dismissCase: jest.fn(), userRisk: jest.fn(), createHoldIfAbsent: jest.fn(), releaseHold: jest.fn() } as any);

    await service.autoMatchExpiredBiddingTrips();
    expect(prisma.tripEvent.create).not.toHaveBeenCalled();
    expect(ws.emitTrip).not.toHaveBeenCalled();
  });

  it('point-in-polygon works for inside and outside points', () => {
    const service = new RideService({} as any, {} as any, { applyScoreEvent: jest.fn(), ensureDriverCanGoOnline: jest.fn() } as any, { evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }), getPremiumContext: jest.fn().mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }), isPeakNow: jest.fn().mockResolvedValue(false), getMyBadge: jest.fn(), getConfigByKey: jest.fn(), putConfig: jest.fn() } as any, { computeDriverLevel: jest.fn(, computePassengerLevel: jest.fn(, getActiveCommissionBps: jest.fn( } as any, { captureFingerprint: jest.fn(), applySignal: jest.fn(), runPeriodicDetections: jest.fn(), listCases: jest.fn(), getCase: jest.fn(), assignCase: jest.fn(), resolveCase: jest.fn(), dismissCase: jest.fn(), userRisk: jest.fn(), createHoldIfAbsent: jest.fn(), releaseHold: jest.fn() } as any);
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
    const service = new RideService({} as any, {} as any, { applyScoreEvent: jest.fn(), ensureDriverCanGoOnline: jest.fn() } as any, { evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }), getPremiumContext: jest.fn().mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }), isPeakNow: jest.fn().mockResolvedValue(false), getMyBadge: jest.fn(), getConfigByKey: jest.fn(), putConfig: jest.fn() } as any, { computeDriverLevel: jest.fn(, computePassengerLevel: jest.fn(, getActiveCommissionBps: jest.fn( } as any, { captureFingerprint: jest.fn(), applySignal: jest.fn(), runPeriodicDetections: jest.fn(), listCases: jest.fn(), getCase: jest.fn(), assignCase: jest.fn(), resolveCase: jest.fn(), dismissCase: jest.fn(), userRisk: jest.fn(), createHoldIfAbsent: jest.fn(), releaseHold: jest.fn() } as any);
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
    const service = new RideService(prisma, { emitTrip: jest.fn() } as any, { applyScoreEvent: jest.fn(), ensureDriverCanGoOnline: jest.fn() } as any, { evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }), getPremiumContext: jest.fn().mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }), isPeakNow: jest.fn().mockResolvedValue(false), getMyBadge: jest.fn(), getConfigByKey: jest.fn(), putConfig: jest.fn() } as any, { computeDriverLevel: jest.fn(, computePassengerLevel: jest.fn(, getActiveCommissionBps: jest.fn( } as any, { captureFingerprint: jest.fn(), applySignal: jest.fn(), runPeriodicDetections: jest.fn(), listCases: jest.fn(), getCase: jest.fn(), assignCase: jest.fn(), resolveCase: jest.fn(), dismissCase: jest.fn(), userRisk: jest.fn(), createHoldIfAbsent: jest.fn(), releaseHold: jest.fn() } as any);
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
    const service = new RideService(prisma, ws, { applyScoreEvent: jest.fn(), ensureDriverCanGoOnline: jest.fn(), listScores: jest.fn(), getUserScoreDetail: jest.fn(), createManualRestriction: jest.fn(), liftRestriction: jest.fn(), adjustScore: jest.fn() } as any, { evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }), getPremiumContext: jest.fn().mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }), isPeakNow: jest.fn().mockResolvedValue(false), getMyBadge: jest.fn(), getConfigByKey: jest.fn(), putConfig: jest.fn() } as any, { computeDriverLevel: jest.fn(, computePassengerLevel: jest.fn(, getActiveCommissionBps: jest.fn( } as any, { captureFingerprint: jest.fn(), applySignal: jest.fn(), runPeriodicDetections: jest.fn(), listCases: jest.fn(), getCase: jest.fn(), assignCase: jest.fn(), resolveCase: jest.fn(), dismissCase: jest.fn(), userRisk: jest.fn(), createHoldIfAbsent: jest.fn(), releaseHold: jest.fn() } as any);
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
    const service = new RideService(prisma, ws, { applyScoreEvent: jest.fn(), ensureDriverCanGoOnline: jest.fn(), listScores: jest.fn(), getUserScoreDetail: jest.fn(), createManualRestriction: jest.fn(), liftRestriction: jest.fn(), adjustScore: jest.fn() } as any, { evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }), getPremiumContext: jest.fn().mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }), isPeakNow: jest.fn().mockResolvedValue(false), getMyBadge: jest.fn(), getConfigByKey: jest.fn(), putConfig: jest.fn() } as any, { computeDriverLevel: jest.fn(, computePassengerLevel: jest.fn(, getActiveCommissionBps: jest.fn( } as any, { captureFingerprint: jest.fn(), applySignal: jest.fn(), runPeriodicDetections: jest.fn(), listCases: jest.fn(), getCase: jest.fn(), assignCase: jest.fn(), resolveCase: jest.fn(), dismissCase: jest.fn(), userRisk: jest.fn(), createHoldIfAbsent: jest.fn(), releaseHold: jest.fn() } as any);
    jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(21_000).mockReturnValue(21_000);

    await service.trackLocation('t1', 'd1', { lat: 0.02, lng: 0.02 });
    await service.trackLocation('t1', 'd1', { lat: 0.02, lng: 0.02 });

    expect(prisma.safetyAlert.create).toHaveBeenCalled();
    (Date.now as jest.Mock).mockRestore();
  });




  it('presence online rejects blocked driver', async () => {
    const prisma: any = { driverPresence: { upsert: jest.fn() } };
    const scoreService: any = { ensureDriverCanGoOnline: jest.fn().mockRejectedValue(new ForbiddenException('blocked')) };
    const service = new RideService(prisma, {} as any, scoreService, { evaluatePeakGate: jest.fn(), getPremiumContext: jest.fn(), isPeakNow: jest.fn(), getMyBadge: jest.fn(), getConfigByKey: jest.fn(), putConfig: jest.fn() } as any, { computeDriverLevel: jest.fn(, computePassengerLevel: jest.fn(, getActiveCommissionBps: jest.fn( } as any, { captureFingerprint: jest.fn(), applySignal: jest.fn(), runPeriodicDetections: jest.fn(), listCases: jest.fn(), getCase: jest.fn(), assignCase: jest.fn(), resolveCase: jest.fn(), dismissCase: jest.fn(), userRisk: jest.fn(), createHoldIfAbsent: jest.fn(), releaseHold: jest.fn() } as any);
    await expect(service.presenceOnline('d1', { lat: 0, lng: 0, category: 'AUTO' as any })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('matching request prioritizes higher score drivers', async () => {
    const ws: any = { emitTrip: jest.fn(), emitToDriver: jest.fn() };
    const prisma: any = {
      trip: { create: jest.fn().mockResolvedValue({ id: 't1', status: 'BIDDING', origin_address: 'A', dest_address: 'B', price_base: 1000, bidding_expires_at: new Date() }) },
      tripRouteBaseline: { create: jest.fn().mockResolvedValue({}) },
      tripSafetyState: { create: jest.fn().mockResolvedValue({}) },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
      driverPresence: { findMany: jest.fn().mockResolvedValue([
        { driver_user_id: 'dLow', last_seen_at: new Date(), last_lat: 0, last_lng: 0 },
        { driver_user_id: 'dHigh', last_seen_at: new Date(), last_lat: 0, last_lng: 0 },
      ]) },
      userScore: { findMany: jest.fn().mockResolvedValue([
        { user_id: 'dLow', score: 20 },
        { user_id: 'dHigh', score: 99 },
      ]) },
    };
    const service = new RideService(prisma, ws, { applyScoreEvent: jest.fn(), ensureDriverCanGoOnline: jest.fn() } as any, { evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }), getPremiumContext: jest.fn().mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }), isPeakNow: jest.fn().mockResolvedValue(false), getMyBadge: jest.fn(), getConfigByKey: jest.fn(), putConfig: jest.fn() } as any, { computeDriverLevel: jest.fn(, computePassengerLevel: jest.fn(, getActiveCommissionBps: jest.fn( } as any, { captureFingerprint: jest.fn(), applySignal: jest.fn(), runPeriodicDetections: jest.fn(), listCases: jest.fn(), getCase: jest.fn(), assignCase: jest.fn(), resolveCase: jest.fn(), dismissCase: jest.fn(), userRisk: jest.fn(), createHoldIfAbsent: jest.fn(), releaseHold: jest.fn() } as any);
    await service.requestTrip('p1', { origin_lat: 0, origin_lng: 0, origin_address: 'A', dest_lat: 1, dest_lng: 1, dest_address: 'B', category: 'AUTO' as any });
    expect(ws.emitToDriver.mock.calls[0][0]).toBe('dHigh');
  });



  it('matching ordering excludes blocked driver by status', async () => {
    const ws: any = { emitTrip: jest.fn(), emitToDriver: jest.fn(), emitToUser: jest.fn() };
    const prisma: any = {
      trip: { create: jest.fn().mockResolvedValue({ id: 't1', status: 'BIDDING', origin_address: 'A', dest_address: 'B', price_base: 1000, bidding_expires_at: new Date() }) },
      tripRouteBaseline: { create: jest.fn().mockResolvedValue({}) },
      tripSafetyState: { create: jest.fn().mockResolvedValue({}) },
      tripEvent: { create: jest.fn().mockResolvedValue({}) },
      driverPresence: { findMany: jest.fn().mockResolvedValue([{ driver_user_id: 'dBlocked', last_seen_at: new Date(), last_lat: 0, last_lng: 0 }, { driver_user_id: 'dOk', last_seen_at: new Date(), last_lat: 0, last_lng: 0 }]) },
      userScore: { findMany: jest.fn().mockResolvedValue([{ user_id: 'dBlocked', score: 95, status: 'BLOCKED' }, { user_id: 'dOk', score: 70, status: 'NONE' }]) },
      appConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      scoreEvent: { count: jest.fn().mockResolvedValue(0) },
    };
    const scoreService: any = { getOrCreateUserScore: jest.fn().mockResolvedValue({ score: 80, status: 'NONE' }) };
    const merit: any = { evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }), getPremiumContext: jest.fn().mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }), isPeakNow: jest.fn().mockResolvedValue(false) };
    const service = new RideService(prisma, ws, scoreService, merit, { computeDriverLevel: jest.fn(, computePassengerLevel: jest.fn(, getActiveCommissionBps: jest.fn( } as any, { captureFingerprint: jest.fn(), applySignal: jest.fn(), runPeriodicDetections: jest.fn(), listCases: jest.fn(), getCase: jest.fn(), assignCase: jest.fn(), resolveCase: jest.fn(), dismissCase: jest.fn(), userRisk: jest.fn(), createHoldIfAbsent: jest.fn(), releaseHold: jest.fn() } as any);
    await service.requestTrip('p1', { origin_lat: 0, origin_lng: 0, origin_address: 'A', dest_lat: 1, dest_lng: 1, dest_address: 'B', category: 'AUTO' as any });
    expect(ws.emitToDriver).toHaveBeenCalledWith('dOk', 'trip.bidding.started', expect.any(Object));
  });

  it('invalid FSM transition fails', async () => {
    const prisma: any = { trip: { findUnique: jest.fn().mockResolvedValue({ id: 't1', driver_user_id: 'd1', status: TripStatus.MATCHED }) } };
    const service = new RideService(prisma, {} as any, { applyScoreEvent: jest.fn(), ensureDriverCanGoOnline: jest.fn() } as any, { evaluatePeakGate: jest.fn().mockResolvedValue({ allowed: true, limitedMode: false }), getPremiumContext: jest.fn().mockResolvedValue({ zone: null, eligible: true, premium_bonus: 0 }), isPeakNow: jest.fn().mockResolvedValue(false), getMyBadge: jest.fn(), getConfigByKey: jest.fn(), putConfig: jest.fn() } as any, { computeDriverLevel: jest.fn(, computePassengerLevel: jest.fn(, getActiveCommissionBps: jest.fn( } as any, { captureFingerprint: jest.fn(), applySignal: jest.fn(), runPeriodicDetections: jest.fn(), listCases: jest.fn(), getCase: jest.fn(), assignCase: jest.fn(), resolveCase: jest.fn(), dismissCase: jest.fn(), userRisk: jest.fn(), createHoldIfAbsent: jest.fn(), releaseHold: jest.fn() } as any);
    await expect(service.completeTrip('t1', 'd1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
