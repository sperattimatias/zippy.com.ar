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

  it('invalid FSM transition fails', async () => {
    const prisma: any = { trip: { findUnique: jest.fn().mockResolvedValue({ id: 't1', driver_user_id: 'd1', status: TripStatus.MATCHED }) } };
    const service = new RideService(prisma, {} as any);
    await expect(service.completeTrip('t1', 'd1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
