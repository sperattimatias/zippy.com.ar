import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ActorType, RestrictionStatus, ScoreEventType } from '@prisma/client';
import { MeritocracyService } from '../meritocracy/meritocracy.service';
import { PrismaService } from '../prisma/prisma.service';
import { RideGateway } from '../ride/ride.gateway';
import { ScoreService } from './score.service';

const createService = async (prisma: any, ws?: any, merit?: any) => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ScoreService,
      { provide: PrismaService, useValue: prisma },
      { provide: RideGateway, useValue: ws ?? { emitToUser: jest.fn(), emitSosAlert: jest.fn() } },
      { provide: MeritocracyService, useValue: merit ?? { updateBadge: jest.fn() } },
    ],
  }).compile();
  return moduleRef.get(ScoreService);
};

describe('ScoreService', () => {
  it('clamps score to 0..100', async () => {
    const prisma: any = {
      userScore: {
        upsert: jest.fn().mockResolvedValue({ user_id: 'u1', actor_type: ActorType.DRIVER, score: 95, status: RestrictionStatus.NONE }),
        update: jest.fn().mockResolvedValue({ user_id: 'u1', actor_type: ActorType.DRIVER, score: 100, status: RestrictionStatus.NONE }),
      },
      scoreEvent: { create: jest.fn().mockResolvedValue({}) },
      userRestriction: { create: jest.fn() },
      $transaction: jest.fn(async (fn: any) => fn({ userScore: prisma.userScore, scoreEvent: prisma.scoreEvent, userRestriction: prisma.userRestriction })),
    };

    const svc = await createService(prisma);
    const out = await svc.applyScoreEvent({ user_id: 'u1', actor_type: ActorType.DRIVER, type: ScoreEventType.MANUAL_ADJUST, delta: 20 });
    expect(out.updatedScore.score).toBe(100);
  });

  it('auto-block creates restriction for score below 40', async () => {
    const prisma: any = {
      userScore: {
        upsert: jest.fn().mockResolvedValue({ user_id: 'u1', actor_type: ActorType.DRIVER, score: 45, status: RestrictionStatus.LIMITED }),
        update: jest.fn().mockResolvedValue({ user_id: 'u1', actor_type: ActorType.DRIVER, score: 30, status: RestrictionStatus.BLOCKED }),
      },
      scoreEvent: { create: jest.fn().mockResolvedValue({}) },
      userRestriction: { create: jest.fn().mockResolvedValue({ id: 'r1' }) },
      $transaction: jest.fn(async (fn: any) => fn({ userScore: prisma.userScore, scoreEvent: prisma.scoreEvent, userRestriction: prisma.userRestriction })),
    };

    const svc = await createService(prisma);
    const out = await svc.applyScoreEvent({ user_id: 'u1', actor_type: ActorType.DRIVER, type: ScoreEventType.DRIVER_CANCEL_LATE, delta: -15 });

    expect(out.autoRestriction).toBeTruthy();
    expect(prisma.userRestriction.create).toHaveBeenCalled();
  });

  it('driver presence online is blocked when active blocked restriction exists', async () => {
    const prisma: any = {
      userRestriction: {
        findFirst: jest.fn().mockResolvedValue({
          status: RestrictionStatus.BLOCKED,
          ends_at: new Date(Date.now() + 1000),
        }),
      },
    };

    const svc = await createService(prisma);
    await expect(svc.ensureDriverCanGoOnline('d1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
