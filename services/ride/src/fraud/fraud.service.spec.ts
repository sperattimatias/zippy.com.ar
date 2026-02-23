import { FraudSeverity, FraudSignalType, HoldType } from '@prisma/client';
import { FraudService } from './fraud.service';

describe('FraudService', () => {
  it('risk score clamps 0..100 and creates high hold', async () => {
    const prisma: any = {
      fraudSignal: { create: jest.fn().mockResolvedValue({ id: 's1', user_id: 'u1', severity: FraudSeverity.HIGH }) },
      financialRiskScore: {
        upsert: jest.fn().mockResolvedValue({ user_id: 'u1', score: 45 }),
        update: jest.fn(),
      },
      userHold: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
      fraudCase: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'c1', severity: FraudSeverity.HIGH, title: 'x' }) },
      fraudCaseSignalLink: { upsert: jest.fn() },
    };
    const svc = new FraudService(prisma, { emitToUser: jest.fn(), emitSosAlert: jest.fn() } as any);
    await svc.applySignal({ user_id: 'u1', type: FraudSignalType.MANUAL_REVIEW_TRIGGER, severity: FraudSeverity.HIGH, score_delta: 10 });
    expect(prisma.userHold.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ hold_type: HoldType.FEATURE_LIMIT }) }));
  });

  it('case link dedupe uses upsert', async () => {
    const prisma: any = {
      fraudSignal: { create: jest.fn().mockResolvedValue({ id: 's1', user_id: 'u1', severity: FraudSeverity.MEDIUM }) },
      financialRiskScore: { upsert: jest.fn().mockResolvedValue({ user_id: 'u1', score: 0 }), update: jest.fn() },
      userHold: { findFirst: jest.fn(), create: jest.fn() },
      fraudCase: { findFirst: jest.fn().mockResolvedValue({ id: 'c1', severity: FraudSeverity.MEDIUM, title: 'open' }) },
      fraudCaseSignalLink: { upsert: jest.fn() },
    };
    const svc = new FraudService(prisma, { emitToUser: jest.fn(), emitSosAlert: jest.fn() } as any);
    await svc.applySignal({ user_id: 'u1', type: FraudSignalType.REPEATED_PAIR_TRIPS, severity: FraudSeverity.MEDIUM, score_delta: 5 });
    expect(prisma.fraudCaseSignalLink.upsert).toHaveBeenCalled();
  });
});
