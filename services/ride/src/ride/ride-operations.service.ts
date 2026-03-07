import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ActorType,
  HoldType,
  LevelTier,
  Prisma,
  RestrictionStatus,
  SafetyAlertStatus,
  TripStatus,
} from '@prisma/client';

import type {
  GeoZoneCreateDto,
  GeoZonePatchDto,
  SafetyAlertFilterDto,
  SafetyAlertUpdateDto,
} from '../dto/ride.dto';
import { FraudService } from '../fraud/fraud.service';
import { LevelAndBonusService } from '../levels/level-bonus.service';
import { MeritocracyService } from '../meritocracy/meritocracy.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScoreService } from '../score/score.service';
import { logAdminAuditEntry } from './ride-admin-audit.logic';
import { GeoZoneCacheService } from './geozone-cache.service';
import { RideGateway } from './ride.gateway';

@Injectable()
export class RideOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: RideGateway,
    private readonly scoreService: ScoreService,
    private readonly merit: MeritocracyService,
    private readonly levelBonus: LevelAndBonusService,
    private readonly fraud: FraudService,
    private readonly geoZoneCache: GeoZoneCacheService,
  ) {}

  private normalizePolygon(poly: Array<{ lat: number; lng: number }>) {
    if (!Array.isArray(poly) || poly.length < 3)
      throw new BadRequestException('polygon requires at least 3 points');
    const first = poly[0],
      last = poly[poly.length - 1];
    if (first.lat !== last.lat || first.lng !== last.lng) poly = [...poly, first];
    return poly;
  }

  async createGeoZone(dto: GeoZoneCreateDto) {
    const created = await this.prisma.geoZone.create({
      data: { ...dto, polygon_json: this.normalizePolygon(dto.polygon_json) as any },
    });
    this.geoZoneCache.invalidateActiveZones();
    return created;
  }

  async listGeoZones() {
    return this.prisma.geoZone.findMany({ orderBy: { created_at: 'desc' } });
  }

  async patchGeoZone(id: string, dto: GeoZonePatchDto) {
    const data: any = { ...dto };
    if (dto.polygon_json) data.polygon_json = this.normalizePolygon(dto.polygon_json);
    const updated = await this.prisma.geoZone.update({ where: { id }, data });
    this.geoZoneCache.invalidateActiveZones();
    return updated;
  }

  async deleteGeoZone(id: string) {
    await this.prisma.geoZone.delete({ where: { id } });
    this.geoZoneCache.invalidateActiveZones();
    return { message: 'deleted' };
  }

  async listSafetyAlerts(filter: SafetyAlertFilterDto) {
    return this.prisma.safetyAlert.findMany({
      where: filter.status ? { status: filter.status } : {},
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async updateSafetyAlert(id: string, actorUserId: string, dto: SafetyAlertUpdateDto) {
    const data: any = { status: dto.status };
    if (dto.status === SafetyAlertStatus.ACKNOWLEDGED) {
      data.acknowledged_at = new Date();
      data.acknowledged_by_user_id = actorUserId;
    }
    if (dto.status === SafetyAlertStatus.RESOLVED || dto.status === SafetyAlertStatus.DISMISSED) {
      data.resolved_at = new Date();
      data.resolved_by_user_id = actorUserId;
    }
    const alert = await this.prisma.safetyAlert.update({ where: { id }, data });
    this.ws.emitSosAlert('sos.alert.updated', { id: alert.id, status: alert.status });
    return alert;
  }

  async tripSafety(tripId: string) {
    const safety = await this.prisma.tripSafetyState.findUnique({ where: { trip_id: tripId } });
    const alerts = await this.prisma.safetyAlert.findMany({
      where: { trip_id: tripId },
      orderBy: { created_at: 'desc' },
    });
    const locations = await this.prisma.tripLocation.findMany({
      where: { trip_id: tripId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    return { safety, alerts, locations };
  }

  async listScores(filter: { actor_type?: ActorType; status?: RestrictionStatus; q?: string }) {
    return this.scoreService.listScores(filter.actor_type, filter.status, filter.q);
  }

  async userScoreDetail(userId: string, actorType: ActorType) {
    return this.scoreService.getUserScoreDetail(userId, actorType);
  }

  async createManualRestriction(
    userId: string,
    actorUserId: string,
    dto: { actor_type: ActorType; status: RestrictionStatus; reason: any; ends_at?: string; notes?: string },
  ) {
    return this.scoreService.createManualRestriction({
      user_id: userId,
      actor_type: dto.actor_type,
      status: dto.status,
      reason: dto.reason,
      ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined,
      notes: dto.notes,
      created_by_user_id: actorUserId,
    });
  }

  async liftRestriction(id: string, actorUserId: string) {
    return this.scoreService.liftRestriction(id, actorUserId);
  }

  async adjustScore(
    userId: string,
    actorUserId: string,
    dto: { actor_type: ActorType; delta: number; notes?: string },
  ) {
    return this.scoreService.adjustScore(userId, dto.actor_type, dto.delta, dto.notes, actorUserId);
  }

  async myBadge(userId: string, actorType: ActorType) {
    return this.merit.getMyBadge(userId, actorType);
  }

  async getConfig(key: string) {
    return this.merit.getConfigByKey(key);
  }

  async putConfig(key: string, value: unknown) {
    return this.merit.putConfig(key, value);
  }

  async listIncentiveCampaigns() {
    const campaigns = await this.prisma.incentiveCampaign.findMany({ orderBy: { created_at: 'desc' } });
    const now = new Date();
    return campaigns.map((campaign) => ({
      ...campaign,
      status:
        campaign.is_active && campaign.starts_at <= now && campaign.ends_at >= now ? 'active' : 'inactive',
    }));
  }

  async createIncentiveCampaign(
    adminUserId: string,
    dto: {
      name: string;
      target_trips?: number;
      target_hours?: number;
      starts_at: string;
      ends_at: string;
      payout_amount: number;
      is_active?: boolean;
    },
  ) {
    const created = await this.prisma.incentiveCampaign.create({
      data: {
        name: dto.name,
        target_trips: dto.target_trips,
        target_hours: dto.target_hours,
        starts_at: new Date(dto.starts_at),
        ends_at: new Date(dto.ends_at),
        payout_amount: dto.payout_amount,
        is_active: dto.is_active ?? true,
        created_by: adminUserId,
      },
    });
    await logAdminAuditEntry(this.prisma, adminUserId, 'incentive.create', 'incentive_campaign', created.id, {
      name: dto.name,
      starts_at: dto.starts_at,
      ends_at: dto.ends_at,
      payout_amount: dto.payout_amount,
    });
    return created;
  }

  async getIncentiveCampaign(id: string) {
    const campaign = await this.prisma.incentiveCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const trips = await this.prisma.trip.findMany({
      where: {
        status: TripStatus.COMPLETED,
        completed_at: { gte: campaign.starts_at, lte: campaign.ends_at },
        driver_user_id: { not: null },
      },
      select: { driver_user_id: true, started_at: true, completed_at: true },
    });

    const blocked = await this.prisma.userScore.findMany({
      where: { actor_type: ActorType.DRIVER, status: RestrictionStatus.BLOCKED },
      select: { user_id: true },
    });
    const blockedSet = new Set(blocked.map((row) => row.user_id));

    const byDriver = new Map<string, { trips_completed: number; hours_completed: number }>();
    for (const trip of trips) {
      const driverId = trip.driver_user_id;
      if (!driverId || blockedSet.has(driverId)) continue;
      const current = byDriver.get(driverId) ?? { trips_completed: 0, hours_completed: 0 };
      current.trips_completed += 1;
      const hours =
        trip.started_at && trip.completed_at
          ? (trip.completed_at.getTime() - trip.started_at.getTime()) / 3600000
          : 0;
      current.hours_completed += Math.max(0, hours);
      byDriver.set(driverId, current);
    }

    const progress = Array.from(byDriver.entries()).map(([driver_id, value]) => ({
      driver_id,
      ...value,
      target_trips: campaign.target_trips,
      target_hours: campaign.target_hours,
      reached:
        (campaign.target_trips ? value.trips_completed >= campaign.target_trips : true) &&
        (campaign.target_hours ? value.hours_completed >= campaign.target_hours : true),
    }));

    return { campaign, progress, excluded_blocked_drivers: blockedSet.size };
  }

  private resolveReportRange(input?: { from?: string; to?: string }) {
    const to = input?.to ? new Date(input.to) : new Date();
    const from = input?.from ? new Date(input.from) : new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
    const safeFrom = Number.isNaN(from.getTime()) ? new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000) : from;
    const safeTo = Number.isNaN(to.getTime()) ? new Date() : to;
    return safeFrom <= safeTo ? { from: safeFrom, to: safeTo } : { from: safeTo, to: safeFrom };
  }

  async adminReportsOverview(query: { from?: string; to?: string }) {
    const range = this.resolveReportRange(query);
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime() + 1) / msPerDay));

    const [totalRides, completedRides, cancelledRides, revenueAgg, activeDriverRows, activeRiderRows, commissionPolicy] = await Promise.all([
      this.prisma.trip.count({ where: { created_at: { gte: range.from, lte: range.to } } }),
      this.prisma.trip.count({ where: { status: TripStatus.COMPLETED, created_at: { gte: range.from, lte: range.to } } }),
      this.prisma.trip.count({ where: { status: { in: [TripStatus.CANCELLED_BY_DRIVER, TripStatus.CANCELLED_BY_PASSENGER] }, created_at: { gte: range.from, lte: range.to } } }),
      this.prisma.trip.aggregate({ _sum: { price_final: true }, where: { status: TripStatus.COMPLETED, created_at: { gte: range.from, lte: range.to } } }),
      this.prisma.trip.groupBy({ by: ['driver_user_id'], where: { driver_user_id: { not: null }, created_at: { gte: range.from, lte: range.to } } }),
      this.prisma.trip.groupBy({ by: ['passenger_user_id'], where: { created_at: { gte: range.from, lte: range.to } } }),
      this.prisma.commissionPolicy.findUnique({ where: { key: 'default_commission_bps' } }),
    ]);

    const defaultCommissionBps = Number(commissionPolicy?.value_json ?? 1000);
    const takeRate = Number(((defaultCommissionBps / 10000) * 100).toFixed(2));
    const revenue = Number(revenueAgg._sum.price_final ?? 0);

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      kpis: {
        rides_per_day: Number((completedRides / days).toFixed(2)),
        cancel_rate: Number((totalRides > 0 ? (cancelledRides / totalRides) * 100 : 0).toFixed(2)),
        revenue,
        take_rate: takeRate,
        active_drivers: activeDriverRows.length,
        active_riders: activeRiderRows.length,
      },
      totals: {
        rides_total: totalRides,
        rides_completed: completedRides,
        rides_cancelled: cancelledRides,
      },
    };
  }

  async adminReportsExportCsv(query: { from?: string; to?: string }) {
    const overview = await this.adminReportsOverview(query);
    const csvRows = [
      ['from', overview.from],
      ['to', overview.to],
      ['rides_per_day', String(overview.kpis.rides_per_day)],
      ['cancel_rate_percent', String(overview.kpis.cancel_rate)],
      ['revenue', String(overview.kpis.revenue)],
      ['take_rate_percent', String(overview.kpis.take_rate)],
      ['active_drivers', String(overview.kpis.active_drivers)],
      ['active_riders', String(overview.kpis.active_riders)],
      ['rides_total', String(overview.totals.rides_total)],
      ['rides_completed', String(overview.totals.rides_completed)],
      ['rides_cancelled', String(overview.totals.rides_cancelled)],
    ];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    return csvRows.map(([k, v]) => `${escape(k)},${escape(v)}`).join('\n');
  }

  async listPremiumZones() {
    return this.prisma.premiumZone.findMany({ orderBy: { created_at: 'desc' } });
  }

  async createPremiumZone(dto: any) {
    return this.prisma.premiumZone.create({ data: dto });
  }

  async patchPremiumZone(id: string, dto: any) {
    return this.prisma.premiumZone.update({ where: { id }, data: dto });
  }

  async deletePremiumZone(id: string) {
    await this.prisma.premiumZone.delete({ where: { id } });
    return { message: 'deleted' };
  }

  async getDriverCurrentCommission(driverUserId: string) {
    return this.levelBonus.getActiveCommissionBps(driverUserId, new Date());
  }

  async adminListLevels(filter: { actor_type?: ActorType; tier?: LevelTier }) {
    return this.levelBonus.listLevels(filter.actor_type, filter.tier);
  }

  async adminListMonthlyPerformance(filter: { year: number; month: number; actor_type?: ActorType }) {
    return this.levelBonus.listMonthlyPerformance(filter.year, filter.month, filter.actor_type);
  }

  async adminListBonuses(filter: { year: number; month: number }) {
    return this.levelBonus.listBonuses(filter.year, filter.month);
  }

  async adminPutPolicy(key: string, value: unknown) {
    return this.levelBonus.putPolicy(key, value);
  }

  async adminRevokeBonus(id: string, reason: string) {
    return this.levelBonus.revokeBonus(id, reason);
  }

  async listFraudCases(filter: { status?: any; severity?: any; q?: string }) {
    return this.fraud.listCases(filter);
  }
  async getFraudCase(id: string) {
    return this.fraud.getCase(id);
  }
  async assignFraudCase(id: string, assignedToUserId: string) {
    return this.fraud.assignCase(id, assignedToUserId);
  }
  async resolveFraudCase(id: string, notes: string) {
    return this.fraud.resolveCase(id, notes);
  }
  async dismissFraudCase(id: string, notes: string) {
    return this.fraud.dismissCase(id, notes);
  }
  async userFraudRisk(userId: string) {
    return this.fraud.userRisk(userId);
  }

  async manualReviewFraudCase(id: string, actorUserId: string, notes: string) {
    const nextNotes = notes?.trim() || 'manual review';
    const assigned = await this.assignFraudCase(id, actorUserId);
    const updated = await this.prisma.fraudCase.update({
      where: { id },
      data: {
        status: 'IN_REVIEW' as any,
        assigned_to_user_id: actorUserId,
        summary: `${assigned.summary ?? ''}\nmanual_review: ${nextNotes}`.trim(),
      },
    });

    await logAdminAuditEntry(this.prisma, actorUserId, 'fraud.manual_review', 'fraud_case', id, {
      notes: nextNotes,
    });
    return updated;
  }

  async blockUserFromFraudCase(id: string, actorUserId: string, userId: string, note: string) {
    const hold = await this.fraud.createHoldIfAbsent(
      userId,
      HoldType.ACCOUNT_BLOCK,
      note || `Blocked by fraud case ${id}`,
      undefined,
      actorUserId,
      { case_id: id, action: 'block_user' },
    );
    await this.assignFraudCase(id, actorUserId);
    await logAdminAuditEntry(this.prisma, actorUserId, 'fraud.block_user', 'user', userId, {
      case_id: id,
      note,
    });
    return { ok: true, hold };
  }

  async blockDriverFromFraudCase(id: string, actorUserId: string, driverId: string, note: string) {
    const hold = await this.fraud.createHoldIfAbsent(
      driverId,
      HoldType.ACCOUNT_BLOCK,
      note || `Driver blocked by fraud case ${id}`,
      undefined,
      actorUserId,
      { case_id: id, action: 'block_driver' },
    );
    await this.assignFraudCase(id, actorUserId);
    await logAdminAuditEntry(this.prisma, actorUserId, 'fraud.block_driver', 'driver', driverId, {
      case_id: id,
      note,
    });
    return { ok: true, hold };
  }

  async freezePaymentsFromFraudCase(
    id: string,
    actorUserId: string,
    dto: { payment_id?: string; trip_id?: string; note?: string },
  ) {
    const fraudCase = await this.getFraudCase(id);
    const payload = {
      action: 'freeze_payments',
      case_id: id,
      payment_id: dto.payment_id ?? null,
      trip_id: dto.trip_id ?? null,
      note: dto.note ?? null,
      actor_user_id: actorUserId,
      at: new Date().toISOString(),
    };

    await this.fraud.applySignal({
      user_id: fraudCase?.fraud_case?.primary_user_id ?? undefined,
      trip_id: dto.trip_id ?? undefined,
      payment_id: dto.payment_id ?? undefined,
      type: 'MANUAL_REVIEW_TRIGGER' as any,
      severity: 'HIGH' as any,
      score_delta: 0,
      payload,
    });

    await this.assignFraudCase(id, actorUserId);

    await logAdminAuditEntry(this.prisma, actorUserId, 'fraud.freeze_payments', 'fraud_case', id, payload);

    return {
      ok: true,
      delegated: false,
      message: 'payment freeze flag recorded for manual review',
      payload,
    };
  }

  async createFraudHold(
    actorUserId: string,
    dto: { user_id: string; hold_type: any; reason: string; ends_at?: string; notes?: unknown },
  ) {
    const hours = dto.ends_at
      ? Math.max(1, Math.ceil((new Date(dto.ends_at).getTime() - Date.now()) / 3600000))
      : undefined;
    return this.fraud.createHoldIfAbsent(dto.user_id, dto.hold_type, dto.reason, hours, actorUserId, {
      notes: dto.notes ?? null,
    });
  }

  async releaseFraudHold(id: string, actorUserId: string) {
    return this.fraud.releaseHold(id, actorUserId);
  }
}
