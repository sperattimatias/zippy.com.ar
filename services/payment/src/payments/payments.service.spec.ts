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
});
