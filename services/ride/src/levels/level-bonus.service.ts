import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ActorType, BonusStatus, BonusType, LevelTier, PeriodStatus, ScoreEventType, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RideGateway } from '../ride/ride.gateway';

type Perf = {
  tripsCompleted: number;
  tripsCancelledLate: number;
  noShowCount: number;
  safetyMajorAlerts: number;
  completionRate: number;
  cancelRate: number;
  avgScore: number;
};

@Injectable()
export class LevelAndBonusService {
  constructor(private readonly prisma: PrismaService, private readonly ws: RideGateway) {}

  private async getPolicy<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.commissionPolicy.findUnique({ where: { key } });
    return (row?.value_json as T) ?? fallback;
  }

  private levelFromRules(score: number, perf: Perf, rules: any, passenger = false): { tier: LevelTier; payload: any } {
    const ok = {
      bronze: score >= (rules?.bronze?.score_gte ?? 60),
      silver: score >= (rules?.silver?.score_gte ?? 75)
        && perf.tripsCompleted >= (rules?.silver?.trips_completed_last30_gte ?? 30)
        && perf.cancelRate < (rules?.silver?.cancel_rate_30d_lt ?? (passenger ? 0.10 : 0.08)),
      gold: score >= (rules?.gold?.score_gte ?? 85)
        && perf.tripsCompleted >= (rules?.gold?.trips_completed_last30_gte ?? 80)
        && perf.cancelRate < (rules?.gold?.cancel_rate_30d_lt ?? (passenger ? 0.06 : 0.05))
        && (passenger || perf.safetyMajorAlerts === (rules?.gold?.safety_major_alerts_30d_eq ?? 0)),
      diamond: score >= (rules?.diamond?.score_gte ?? 92)
        && perf.tripsCompleted >= (rules?.diamond?.trips_completed_last30_gte ?? (passenger ? 80 : 150))
        && perf.cancelRate < (rules?.diamond?.cancel_rate_30d_lt ?? (passenger ? 0.04 : 0.03))
        && (passenger || (perf.safetyMajorAlerts === (rules?.diamond?.safety_major_alerts_30d_eq ?? 0) && perf.noShowCount === (rules?.diamond?.no_show_30d_eq ?? 0))),
    };
    const tier = ok.diamond ? LevelTier.DIAMOND : ok.gold ? LevelTier.GOLD : ok.silver ? LevelTier.SILVER : LevelTier.BRONZE;
    return { tier, payload: { score, perf, rules_snapshot: rules, checks: ok } };
  }

  private async lastWindowPerf(userId: string, actor: ActorType, days: number): Promise<Perf> {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    if (actor === ActorType.DRIVER) {
      const [completed, cancelled, noShow, safety, us] = await Promise.all([
        this.prisma.trip.count({ where: { driver_user_id: userId, status: TripStatus.COMPLETED, completed_at: { gte: since } } }),
        this.prisma.scoreEvent.count({ where: { user_id: userId, actor_type: actor, type: ScoreEventType.DRIVER_CANCEL_LATE, created_at: { gte: since } } }),
        this.prisma.scoreEvent.count({ where: { user_id: userId, actor_type: actor, type: ScoreEventType.DRIVER_NO_SHOW, created_at: { gte: since } } }),
        this.prisma.scoreEvent.count({ where: { user_id: userId, actor_type: actor, type: ScoreEventType.ROUTE_DEVIATION_MAJOR, created_at: { gte: since } } }),
        this.prisma.userScore.findUnique({ where: { user_id_actor_type: { user_id: userId, actor_type: actor } } }),
      ]);
      const total = completed + cancelled + noShow;
      return { tripsCompleted: completed, tripsCancelledLate: cancelled, noShowCount: noShow, safetyMajorAlerts: safety, completionRate: total ? completed / total : 0, cancelRate: total ? cancelled / total : 0, avgScore: us?.score ?? 100 };
    }
    const [completed, cancelled, noShow, us] = await Promise.all([
      this.prisma.trip.count({ where: { passenger_user_id: userId, status: TripStatus.COMPLETED, completed_at: { gte: since } } }),
      this.prisma.scoreEvent.count({ where: { user_id: userId, actor_type: actor, type: ScoreEventType.PASSENGER_CANCEL_LATE, created_at: { gte: since } } }),
      this.prisma.scoreEvent.count({ where: { user_id: userId, actor_type: actor, type: ScoreEventType.PASSENGER_NO_SHOW, created_at: { gte: since } } }),
      this.prisma.userScore.findUnique({ where: { user_id_actor_type: { user_id: userId, actor_type: actor } } }),
    ]);
    const total = completed + cancelled + noShow;
    return { tripsCompleted: completed, tripsCancelledLate: cancelled, noShowCount: noShow, safetyMajorAlerts: 0, completionRate: total ? completed / total : 0, cancelRate: total ? cancelled / total : 0, avgScore: us?.score ?? 100 };
  }

  async computeDriverLevel(userId: string, now = new Date()) {
    const rules = await this.getPolicy('level_rules', {} as any);
    const perf = await this.lastWindowPerf(userId, ActorType.DRIVER, 30);
    const { tier, payload } = this.levelFromRules(perf.avgScore, perf, rules.driver ?? {}, false);
    const saved = await this.prisma.userLevel.upsert({
      where: { user_id_actor_type: { user_id: userId, actor_type: ActorType.DRIVER } },
      update: { tier, computed_at: now, valid_until: null, payload_json: payload as any },
      create: { user_id: userId, actor_type: ActorType.DRIVER, tier, computed_at: now, valid_until: null, payload_json: payload as any },
    });
    await this.prisma.userLevelHistory.create({ data: { user_id: userId, actor_type: ActorType.DRIVER, tier, computed_at: now, payload_json: payload as any } });
    this.ws.emitToUser(userId, 'user.level.updated', { actor_type: ActorType.DRIVER, tier });
    return saved;
  }

  async computePassengerLevel(userId: string, now = new Date()) {
    const rules = await this.getPolicy('level_rules', {} as any);
    const perf = await this.lastWindowPerf(userId, ActorType.PASSENGER, 60);
    const { tier, payload } = this.levelFromRules(perf.avgScore, perf, rules.passenger ?? {}, true);
    const saved = await this.prisma.userLevel.upsert({
      where: { user_id_actor_type: { user_id: userId, actor_type: ActorType.PASSENGER } },
      update: { tier, computed_at: now, valid_until: null, payload_json: payload as any },
      create: { user_id: userId, actor_type: ActorType.PASSENGER, tier, computed_at: now, valid_until: null, payload_json: payload as any },
    });
    await this.prisma.userLevelHistory.create({ data: { user_id: userId, actor_type: ActorType.PASSENGER, tier, computed_at: now, payload_json: payload as any } });
    this.ws.emitToUser(userId, 'user.level.updated', { actor_type: ActorType.PASSENGER, tier });
    return saved;
  }

  private performanceIndex(avgScore: number, completionRate: number, cancelRate: number) {
    const value = (avgScore / 100) * 0.55 + completionRate * 0.3 + (1 - cancelRate) * 0.15;
    return Math.max(0, Math.min(1, value));
  }

  async computeMonthlyPerformance(year: number, month: number) {
    const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const to = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const [driverTrips, passengerTrips] = await Promise.all([
      this.prisma.trip.findMany({ where: { OR: [{ completed_at: { gte: from, lt: to } }, { cancelled_at: { gte: from, lt: to } }], driver_user_id: { not: null } }, select: { driver_user_id: true, status: true } }),
      this.prisma.trip.findMany({ where: { OR: [{ completed_at: { gte: from, lt: to } }, { cancelled_at: { gte: from, lt: to } }] }, select: { passenger_user_id: true, status: true } }),
    ]);

    const collect = async (actor: ActorType, users: string[], getTripCounts: (u: string) => { completed: number; cancelled: number }) => {
      for (const userId of users) {
        const counts = getTripCounts(userId);
        const [noShows, safety, us] = await Promise.all([
          this.prisma.scoreEvent.count({ where: { user_id: userId, actor_type: actor, type: actor === ActorType.DRIVER ? ScoreEventType.DRIVER_NO_SHOW : ScoreEventType.PASSENGER_NO_SHOW, created_at: { gte: from, lt: to } } }),
          actor === ActorType.DRIVER ? this.prisma.safetyAlert.count({ where: { type: { in: ['ROUTE_DEVIATION_MAJOR', 'TRACKING_LOST'] as any }, created_at: { gte: from, lt: to }, trip: { driver_user_id: userId } } }) : Promise.resolve(0),
          this.prisma.userScore.findUnique({ where: { user_id_actor_type: { user_id: userId, actor_type: actor } } }),
        ]);
        const total = counts.completed + counts.cancelled + noShows;
        const completionRate = total ? counts.completed / total : 0;
        const cancelRate = total ? counts.cancelled / total : 0;
        const avgScore = us?.score ?? 100;
        const pi = this.performanceIndex(avgScore, completionRate, cancelRate);
        await this.prisma.monthlyPerformance.upsert({
          where: { user_id_actor_type_year_month: { user_id: userId, actor_type: actor, year, month } },
          update: { trips_completed: counts.completed, trips_cancelled_late: counts.cancelled, no_show_count: noShows, avg_score: avgScore, safety_major_alerts: safety, completion_rate: completionRate, cancel_rate: cancelRate, performance_index: pi, status: PeriodStatus.FINALIZED, computed_at: new Date() },
          create: { user_id: userId, actor_type: actor, year, month, trips_completed: counts.completed, trips_cancelled_late: counts.cancelled, no_show_count: noShows, avg_score: avgScore, safety_major_alerts: safety, completion_rate: completionRate, cancel_rate: cancelRate, performance_index: pi, status: PeriodStatus.FINALIZED, computed_at: new Date() },
        });
      }
    };

    const dUsers = [...new Set(driverTrips.map((t) => t.driver_user_id).filter(Boolean) as string[])];
    const pUsers = [...new Set(passengerTrips.map((t) => t.passenger_user_id))];
    await collect(ActorType.DRIVER, dUsers, (u) => ({ completed: driverTrips.filter((t) => t.driver_user_id === u && t.status === TripStatus.COMPLETED).length, cancelled: driverTrips.filter((t) => t.driver_user_id === u && t.status === TripStatus.CANCELLED_BY_DRIVER).length }));
    await collect(ActorType.PASSENGER, pUsers, (u) => ({ completed: passengerTrips.filter((t) => t.passenger_user_id === u && t.status === TripStatus.COMPLETED).length, cancelled: passengerTrips.filter((t) => t.passenger_user_id === u && t.status === TripStatus.CANCELLED_BY_PASSENGER).length }));
    return { year, month, drivers: dUsers.length, passengers: pUsers.length };
  }

  async computeMonthlyBonuses(year: number, month: number) {
    const rules = await this.getPolicy('bonus_rules', { top_10_discount_bps: 300, top_3_discount_bps: 500, top_1_discount_bps: 800, min_trips_completed: 40, require_no_show_eq: 0, require_safety_major_alerts_eq: 0 });
    const rows = await this.prisma.monthlyPerformance.findMany({ where: { year, month, actor_type: ActorType.DRIVER }, orderBy: { performance_index: 'desc' } });
    const eligible = rows.filter((r) => r.trips_completed >= (rules.min_trips_completed ?? 40) && r.no_show_count === (rules.require_no_show_eq ?? 0) && r.safety_major_alerts === (rules.require_safety_major_alerts_eq ?? 0));
    const total = Math.max(eligible.length, 1);
    const nextMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const nextMonthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    for (let i = 0; i < eligible.length; i++) {
      const r = eligible[i];
      const percentile = (i + 1) / total;
      const discount = percentile <= 0.01 ? (rules.top_1_discount_bps ?? 800) : percentile <= 0.03 ? (rules.top_3_discount_bps ?? 500) : percentile <= 0.10 ? (rules.top_10_discount_bps ?? 300) : 0;
      if (!discount) continue;
      const bonus = await this.prisma.monthlyBonusLedger.upsert({
        where: { driver_user_id_year_month: { driver_user_id: r.user_id, year, month } },
        update: { discount_bps: discount, bonus_type: BonusType.COMMISSION_DISCOUNT, status: BonusStatus.ACTIVE, reason: `percentile_${Math.round(percentile * 10000) / 100}`, starts_at: nextMonthStart, ends_at: nextMonthEnd },
        create: { driver_user_id: r.user_id, year, month, discount_bps: discount, bonus_type: BonusType.COMMISSION_DISCOUNT, status: BonusStatus.ACTIVE, reason: `percentile_${Math.round(percentile * 10000) / 100}`, starts_at: nextMonthStart, ends_at: nextMonthEnd },
      });
      this.ws.emitToUser(r.user_id, 'driver.bonus.assigned', { year, month, discount_bps: bonus.discount_bps, starts_at: bonus.starts_at, ends_at: bonus.ends_at });
    }
    this.ws.emitSosAlert('admin.bonus.generated', { year, month, eligible: eligible.length });
    return { year, month, eligible: eligible.length };
  }

  async getActiveCommissionBps(driverUserId: string, at = new Date()) {
    const defaultBps = Number(await this.getPolicy('default_commission_bps', 1000));
    const rules = await this.getPolicy('bonus_rules', { commission_floor_bps: 200 });
    const bonus = await this.prisma.monthlyBonusLedger.findFirst({
      where: { driver_user_id: driverUserId, status: BonusStatus.ACTIVE, starts_at: { lte: at }, ends_at: { gte: at } },
      orderBy: { created_at: 'desc' },
    });
    const discount = bonus?.discount_bps ?? 0;
    const effective = Math.max(defaultBps - discount, rules.commission_floor_bps ?? 200);
    return { default_bps: defaultBps, discount_bps: discount, effective_bps: effective, bonus_valid_until: bonus?.ends_at ?? null };
  }

  @Cron('0 3 * * *')
  async dailyRecomputeLevels() {
    const activeDrivers = await this.prisma.trip.findMany({ where: { created_at: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) }, driver_user_id: { not: null } }, select: { driver_user_id: true } });
    const activePassengers = await this.prisma.trip.findMany({ where: { created_at: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } }, select: { passenger_user_id: true } });
    for (const userId of [...new Set(activeDrivers.map((x) => x.driver_user_id!).filter(Boolean))]) await this.computeDriverLevel(userId);
    for (const userId of [...new Set(activePassengers.map((x) => x.passenger_user_id).filter(Boolean))]) await this.computePassengerLevel(userId);
  }

  @Cron('30 3 1 * *')
  async monthlyPerformanceJob() {
    const now = new Date();
    const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
    const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();
    await this.computeMonthlyPerformance(year, month);
  }

  @Cron('0 4 1 * *')
  async monthlyBonusJob() {
    const now = new Date();
    const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
    const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();
    await this.computeMonthlyBonuses(year, month);
  }

  async listLevels(actorType?: ActorType, tier?: LevelTier) {
    return this.prisma.userLevel.findMany({ where: { ...(actorType ? { actor_type: actorType } : {}), ...(tier ? { tier } : {}) }, orderBy: { computed_at: 'desc' }, take: 300 });
  }

  async listMonthlyPerformance(year: number, month: number, actorType?: ActorType) {
    return this.prisma.monthlyPerformance.findMany({ where: { year, month, ...(actorType ? { actor_type: actorType } : {}) }, orderBy: { performance_index: 'desc' }, take: 500 });
  }

  async listBonuses(year: number, month: number) {
    return this.prisma.monthlyBonusLedger.findMany({ where: { year, month }, orderBy: [{ discount_bps: 'desc' }, { created_at: 'desc' }] });
  }

  async putPolicy(key: string, value: unknown) {
    return this.prisma.commissionPolicy.upsert({ where: { key }, update: { value_json: value as any }, create: { key, value_json: value as any } });
  }

  async revokeBonus(id: string, reason: string) {
    return this.prisma.monthlyBonusLedger.update({ where: { id }, data: { status: BonusStatus.REVOKED, reason } });
  }
}
