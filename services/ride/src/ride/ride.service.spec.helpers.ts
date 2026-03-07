import { Test } from '@nestjs/testing';

import { MetricsService } from '../metrics/metrics.service';
import { FraudService } from '../fraud/fraud.service';
import { LevelAndBonusService } from '../levels/level-bonus.service';
import { MeritocracyService } from '../meritocracy/meritocracy.service';
import { ScoreService } from '../score/score.service';
import { RideGateway } from './ride.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { DriverGeoIndexService } from './driver-geo-index.service';
import { GeoZoneCacheService } from './geozone-cache.service';
import { RateLimitService } from './rate-limit.service';
import { RedisStateService } from './redis-state.service';
import { RideService } from './ride.service';
import { RideOperationsService } from './ride-operations.service';

export const fraudMock = () => ({
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

const defaultGeoZoneCache = () => ({
  getActiveZones: jest.fn().mockResolvedValue([]),
  isInsideAnyZone: jest.fn().mockResolvedValue(false),
  invalidate: jest.fn(),
});

const defaultRedisState = () => ({
  getDriverAssignments15m: jest.fn().mockResolvedValue(0),
  incrementDriverAssignments15m: jest.fn().mockResolvedValue(1),
  tryAcquireLocationThrottle: jest.fn().mockResolvedValue(true),
  getDeviationWindow: jest.fn().mockResolvedValue(null),
  setDeviationWindow: jest.fn().mockResolvedValue(undefined),
  getTrackingState: jest.fn().mockResolvedValue('none'),
  setTrackingState: jest.fn().mockResolvedValue(undefined),
  clearTripTrackingState: jest.fn().mockResolvedValue(undefined),
});

const defaultDriverGeoIndex = () => ({
  findNearby: jest.fn().mockResolvedValue([]),
  upsertDriverLocation: jest.fn().mockResolvedValue(undefined),
  setDriverAlive: jest.fn().mockResolvedValue(undefined),
  getAliveDriverIds: jest.fn().mockResolvedValue(null),
});

const defaultRateLimit = () => ({
  isAllowed: jest.fn().mockResolvedValue(true),
});

const defaultRideOperations = () => ({
  createGeoZone: jest.fn(),
  listGeoZones: jest.fn(),
  patchGeoZone: jest.fn(),
  deleteGeoZone: jest.fn(),
  listSafetyAlerts: jest.fn(),
  updateSafetyAlert: jest.fn(),
  tripSafety: jest.fn(),
  listScores: jest.fn(),
  userScoreDetail: jest.fn(),
  createManualRestriction: jest.fn(),
  liftRestriction: jest.fn(),
  adjustScore: jest.fn(),
  myBadge: jest.fn(),
  getConfig: jest.fn(),
  putConfig: jest.fn(),
  listIncentiveCampaigns: jest.fn(),
  createIncentiveCampaign: jest.fn(),
  getIncentiveCampaign: jest.fn(),
  adminReportsOverview: jest.fn(),
  adminReportsExportCsv: jest.fn(),
  listPremiumZones: jest.fn(),
  createPremiumZone: jest.fn(),
  patchPremiumZone: jest.fn(),
  deletePremiumZone: jest.fn(),
  getDriverCurrentCommission: jest.fn(),
  adminListLevels: jest.fn(),
  adminListMonthlyPerformance: jest.fn(),
  adminListBonuses: jest.fn(),
  adminPutPolicy: jest.fn(),
  adminRevokeBonus: jest.fn(),
  listFraudCases: jest.fn(),
  getFraudCase: jest.fn(),
  assignFraudCase: jest.fn(),
  resolveFraudCase: jest.fn(),
  dismissFraudCase: jest.fn(),
  userFraudRisk: jest.fn(),
  manualReviewFraudCase: jest.fn(),
  blockUserFromFraudCase: jest.fn(),
  blockDriverFromFraudCase: jest.fn(),
  freezePaymentsFromFraudCase: jest.fn(),
  createFraudHold: jest.fn(),
  releaseFraudHold: jest.fn(),
});


const withDefaultPrisma = (prisma: any) => ({
  geoZone: { findMany: jest.fn().mockResolvedValue([]) },
  ...(prisma ?? {}),
});

export const createRideService = async (...args: any[]) => {
  const [prisma, ws, scoreService, merit, levelBonus, fraud] = args;
  const geoZoneCache = args[6] ?? defaultGeoZoneCache();
  const redisState = args[7] ?? defaultRedisState();
  const driverGeoIndex = args[8] ?? defaultDriverGeoIndex();
  let rateLimit = args[9];
  let metrics = args[10];

  // Backward-compatible test argument shape used before DI refactor:
  // (..., geoZoneCache, redisState, driverGeoIndex, metrics, rateLimit)
  if (!rateLimit && metrics && typeof metrics.isAllowed === 'function') {
    rateLimit = metrics;
    metrics = undefined;
  }

  const moduleRef = await Test.createTestingModule({
    providers: [
      RideService,
      { provide: PrismaService, useValue: withDefaultPrisma(prisma) },
      { provide: RideGateway, useValue: ws ?? ({} as any) },
      { provide: ScoreService, useValue: scoreService ?? ({} as any) },
      { provide: MeritocracyService, useValue: merit ?? ({} as any) },
      { provide: LevelAndBonusService, useValue: levelBonus ?? ({} as any) },
      { provide: FraudService, useValue: fraud ?? (fraudMock() as any) },
      { provide: GeoZoneCacheService, useValue: geoZoneCache },
      { provide: RedisStateService, useValue: redisState },
      { provide: DriverGeoIndexService, useValue: driverGeoIndex },
      { provide: RateLimitService, useValue: rateLimit ?? defaultRateLimit() },
      { provide: RideOperationsService, useValue: defaultRideOperations() },
      { provide: MetricsService, useValue: metrics },
    ],
  }).compile();

  return moduleRef.get(RideService);
};
