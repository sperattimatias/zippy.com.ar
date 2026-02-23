import { PaymentStatus, SettlementStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  it('create preference calculates commission and floor', async () => {
    const prisma: any = {
      trip: { findUnique: jest.fn().mockResolvedValue({ id: 't1', status: 'COMPLETED', passenger_user_id: 'p1', driver_user_id: 'd1', price_final: 10000, currency: 'ARS', completed_at: new Date() }) },
      tripPayment: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'pay1' }) },
      driverProfile: { findUnique: jest.fn().mockResolvedValue({ user_id: 'd1', mp_account_id: 'mpa_1' }) },
      commissionPolicy: { findUnique: jest.fn().mockResolvedValueOnce({ value_json: 1000 }).mockResolvedValueOnce({ value_json: { commission_floor_bps: 200 } }) },
      monthlyBonusLedger: { findFirst: jest.fn().mockResolvedValue({ discount_bps: 900 }) },
    };
    const svc = new PaymentsService(prisma);
    const out = await svc.createPreference('p1', 't1');
    expect(out.commission_amount).toBe(200);
  });

  it('webhook approved is idempotent and does not duplicate ledger', async () => {
    const prisma: any = {
      tripPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'pay1', trip_id: 't1', driver_user_id: 'd1', amount_total: 1000, commission_amount: 100, driver_net_amount: 900, status: PaymentStatus.PENDING, mp_payment_id: null }),
        update: jest.fn(),
      },
      ledgerEntry: { count: jest.fn().mockResolvedValue(1), createMany: jest.fn() },
      driverPayoutSummary: { findUnique: jest.fn(), upsert: jest.fn() },
      commissionPolicy: { findUnique: jest.fn().mockResolvedValue({ value_json: 1000 }) },
      monthlyBonusLedger: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    const svc = new PaymentsService(prisma);
    const out = await svc.processWebhook('{}', undefined, { status: 'approved', data: { id: 'mpp_1' } });
    expect(out.status).toBe(PaymentStatus.APPROVED);
    expect(prisma.ledgerEntry.createMany).not.toHaveBeenCalled();
  });

  it('rejected webhook marks settlement failed', async () => {
    const prisma: any = {
      tripPayment: { findFirst: jest.fn().mockResolvedValue({ id: 'pay1', trip_id: 't1', status: PaymentStatus.PENDING, mp_payment_id: null }), update: jest.fn() },
    };
    const svc = new PaymentsService(prisma);
    const out = await svc.processWebhook('{}', undefined, { status: 'rejected', data: { id: 'mpp_2' } });
    expect(out.status).toBe(PaymentStatus.REJECTED);
    expect(prisma.tripPayment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ settlement_status: SettlementStatus.FAILED }) }));
  });

  it('partial refund writes proportional reversals and accumulates refunded amount', async () => {
    const now = new Date();
    const prisma: any = {
      $executeRawUnsafe: jest.fn(),
      tripPayment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'pay1', trip_id: 't1', driver_user_id: 'd1', amount_total: 10000, refunded_amount: 1000, commission_amount: 1000, driver_net_amount: 9000, mp_payment_id: 'mp1', status: PaymentStatus.APPROVED }),
        update: jest.fn(),
      },
      tripRefund: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'r1' }),
        update: jest.fn(),
      },
      ledgerEntry: { createMany: jest.fn() },
      driverPayoutSummary: { findUnique: jest.fn().mockResolvedValue({ total_gross: BigInt(10000), total_commission: BigInt(1000), total_bonus_discount: BigInt(0), total_net: BigInt(9000) }), upsert: jest.fn() },
      trip: { findUnique: jest.fn().mockResolvedValue({ completed_at: now }) },
      bonusAdjustmentPending: { create: jest.fn() },
      fraudSignal: { create: jest.fn() },
      tripRefundAggregate: 0,
      tripRefundAgg: { _sum: { amount: 3000 } },
      tripRefund2: null,
    };
    prisma.tripRefund.aggregate = jest.fn().mockResolvedValue({ _sum: { amount: 3000 } });
    prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
    const svc: any = new PaymentsService(prisma);
    svc.mpRefund = jest.fn().mockResolvedValue({ id: 'mpr_1', status: 'approved' });
    const out = await svc.adminRefundTripPayment('pay1', 2000, 'test', 'admin1');
    expect(out.failed).toBeUndefined();
    expect(prisma.ledgerEntry.createMany).toHaveBeenCalled();
    expect(prisma.tripPayment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ refunded_amount: 3000 }) }));
  });

  it('idempotent refund by same key does not duplicate', async () => {
    const prisma: any = {
      $executeRawUnsafe: jest.fn(),
      tripPayment: { findUnique: jest.fn().mockResolvedValue({ id: 'pay1', amount_total: 10000, refunded_amount: 0, status: PaymentStatus.APPROVED }) },
      tripRefund: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({ id: 'r_existing' }),
      },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    const svc = new PaymentsService(prisma);
    const out = await svc.adminRefundTripPayment('pay1', 1000, 'dup', 'admin1');
    expect(out.idempotent).toBe(true);
  });
});
