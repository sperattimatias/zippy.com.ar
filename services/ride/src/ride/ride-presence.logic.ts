import { ForbiddenException, HttpException } from '@nestjs/common';
import { ActorType, TripStatus, type DriverPresence } from '@prisma/client';

import type { PresenceOnlineDto, PresencePingDto } from '../dto/ride.dto';
import type { DriverGeoIndexService } from './driver-geo-index.service';
import type { MeritocracyService } from '../meritocracy/meritocracy.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RateLimitService } from './rate-limit.service';
import type { ScoreService } from '../score/score.service';

type PresenceDeps = {
  prisma: PrismaService;
  scoreService: ScoreService;
  merit: MeritocracyService;
  driverGeoIndex: DriverGeoIndexService;
  rateLimit: RateLimitService;
};

type LiveDriver = {
  driverId: string;
  lat: number;
  lng: number;
  lastSeenAt: string | null;
  isOnline: boolean;
  isFresh: boolean;
  operationalStatus: 'available' | 'on_trip' | 'stale';
  onTrip: boolean;
};

export type LiveDriversPayload = {
  generatedAt: string;
  drivers: LiveDriver[];
  stats: {
    onlineDrivers: number;
    freshDrivers: number;
    staleDrivers: number;
    onTripDrivers: number;
    idleDrivers: number;
  };
};

export function getPresenceFreshnessMs() {
  const freshnessSeconds =
    Math.max(5, Number(process.env.DRIVER_PRESENCE_FRESHNESS_SECONDS ?? 60) || 60);
  return freshnessSeconds * 1000;
}

function isValidPresenceCoords(presence: DriverPresence) {
  return (
    typeof presence.last_lat === 'number' &&
    Number.isFinite(presence.last_lat) &&
    typeof presence.last_lng === 'number' &&
    Number.isFinite(presence.last_lng)
  );
}

export function buildAdminLiveDriversPayload(params: {
  presences: DriverPresence[];
  activeTripDriverIds: Set<string>;
  aliveDriverIds: Set<string> | null;
  nowMs?: number;
}): LiveDriversPayload {
  const nowMs = params.nowMs ?? Date.now();
  const freshnessMs = getPresenceFreshnessMs();

  const filteredPresences = params.presences.filter(isValidPresenceCoords);

  const enrichedDrivers: LiveDriver[] = filteredPresences.map((presence) => {
    const lastSeenAt = presence.last_seen_at;
    const freshByTime = !!lastSeenAt && nowMs - lastSeenAt.getTime() <= freshnessMs;
    const isAliveInRedis = params.aliveDriverIds
      ? params.aliveDriverIds.has(presence.driver_user_id)
      : true;
    const isFresh = freshByTime && isAliveInRedis;
    const onTrip = params.activeTripDriverIds.has(presence.driver_user_id);

    return {
      driverId: presence.driver_user_id,
      lat: presence.last_lat!,
      lng: presence.last_lng!,
      lastSeenAt: lastSeenAt?.toISOString() ?? null,
      isOnline: presence.is_online,
      isFresh,
      operationalStatus: onTrip ? 'on_trip' : isFresh ? 'available' : 'stale',
      onTrip,
    };
  });

  const drivers = enrichedDrivers.filter((driver) => driver.isFresh);

  const freshDrivers = drivers.length;
  const staleDrivers = enrichedDrivers.length - freshDrivers;
  const onTripDrivers = drivers.filter((driver) => driver.onTrip).length;
  const idleDrivers = drivers.filter((driver) => !driver.onTrip).length;

  return {
    generatedAt: new Date(nowMs).toISOString(),
    drivers,
    stats: {
      onlineDrivers: enrichedDrivers.length,
      freshDrivers,
      staleDrivers,
      onTripDrivers,
      idleDrivers,
    },
  };
}

export async function presenceOnline(
  deps: PresenceDeps,
  driverUserId: string,
  dto: PresenceOnlineDto,
) {
  const gate = await deps.scoreService.ensureDriverCanGoOnline(driverUserId);
  const driverScore = await deps.scoreService.getOrCreateUserScore(driverUserId, ActorType.DRIVER);
  const peak = await deps.merit.evaluatePeakGate(
    driverUserId,
    ActorType.DRIVER,
    driverScore.score,
    driverScore.status,
  );
  if (!peak.allowed) throw new ForbiddenException('Peak gate denied for driver');

  const premium = await deps.merit.getPremiumContext(
    { lat: dto.lat, lng: dto.lng },
    ActorType.DRIVER,
    driverScore.score,
  );
  const premiumCfg =
    ((await deps.prisma.appConfig.findUnique({ where: { key: 'premium_zones' } }))?.value_json as any) ??
    { deny_low_driver: false };
  if (premium.zone && !premium.eligible && premiumCfg.deny_low_driver)
    throw new ForbiddenException('Driver score not eligible for premium zone');

  const presence = await deps.prisma.driverPresence.upsert({
    where: { driver_user_id: driverUserId },
    update: {
      is_online: true,
      is_limited: gate.isLimited || peak.limitedMode || (premium.zone ? !premium.eligible : false),
      last_lat: dto.lat,
      last_lng: dto.lng,
      last_seen_at: new Date(),
      vehicle_category: dto.category,
    },
    create: {
      driver_user_id: driverUserId,
      is_online: true,
      is_limited: gate.isLimited || peak.limitedMode || (premium.zone ? !premium.eligible : false),
      last_lat: dto.lat,
      last_lng: dto.lng,
      last_seen_at: new Date(),
      vehicle_category: dto.category,
    },
  });
  await deps.driverGeoIndex.upsert(driverUserId, dto.lat, dto.lng);
  return presence;
}

export async function presenceOffline(deps: PresenceDeps, driverUserId: string) {
  await deps.prisma.driverPresence.updateMany({
    where: { driver_user_id: driverUserId },
    data: { is_online: false },
  });
  return { message: 'offline' };
}

export async function presencePing(deps: PresenceDeps, driverUserId: string, dto: PresencePingDto) {
  const pingAllowed = await deps.rateLimit.isAllowed(`rl:presence_ping:${driverUserId}`, 1, 5);
  if (!pingAllowed) throw new HttpException('Rate limit exceeded', 429);

  await deps.prisma.driverPresence.updateMany({
    where: { driver_user_id: driverUserId },
    data: { last_lat: dto.lat, last_lng: dto.lng, last_seen_at: new Date() },
  });
  await deps.driverGeoIndex.upsert(driverUserId, dto.lat, dto.lng);
  return { message: 'pong' };
}

export async function getAdminLiveDrivers(deps: PresenceDeps) {
  const onlinePresences = await deps.prisma.driverPresence.findMany({
    where: {
      is_online: true,
      last_lat: { not: null },
      last_lng: { not: null },
    },
    orderBy: { last_seen_at: 'desc' },
  });

  const driverIds = onlinePresences.map((presence) => presence.driver_user_id);
  const [activeTrips, aliveFromRedis] = await Promise.all([
    driverIds.length
      ? deps.prisma.trip.findMany({
          where: {
            driver_user_id: { in: driverIds },
            status: { in: [TripStatus.DRIVER_EN_ROUTE, TripStatus.OTP_PENDING, TripStatus.IN_PROGRESS] },
          },
          select: { driver_user_id: true },
        })
      : Promise.resolve([]),
    deps.driverGeoIndex.getAliveDriverIds(driverIds),
  ]);

  return buildAdminLiveDriversPayload({
    presences: onlinePresences,
    activeTripDriverIds: new Set(
      activeTrips
        .map((trip) => trip.driver_user_id)
        .filter((driverId): driverId is string => typeof driverId === 'string' && driverId.length > 0),
    ),
    aliveDriverIds: aliveFromRedis,
  });
}
