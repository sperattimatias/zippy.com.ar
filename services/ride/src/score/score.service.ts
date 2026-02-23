import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActorType, RestrictionReason, RestrictionStatus, ScoreEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RideGateway } from '../ride/ride.gateway';
import { MeritocracyService } from '../meritocracy/meritocracy.service';

@Injectable()
export class ScoreService {
  constructor(private readonly prisma: PrismaService, private readonly ws: RideGateway, private readonly merit: MeritocracyService) {}

  async getOrCreateUserScore(userId: string, actorType: ActorType) {
    return this.prisma.userScore.upsert({
      where: { user_id_actor_type: { user_id: userId, actor_type: actorType } },
      update: {},
      create: { user_id: userId, actor_type: actorType },
    });
  }

  private mapStatus(score: number): RestrictionStatus {
    if (score >= 80) return RestrictionStatus.NONE;
    if (score >= 60) return RestrictionStatus.WARNING;
    if (score >= 40) return RestrictionStatus.LIMITED;
    return RestrictionStatus.BLOCKED;
  }

  async getActiveRestriction(userId: string, actorType: ActorType) {
    const now = new Date();
    return this.prisma.userRestriction.findFirst({
      where: {
        user_id: userId,
        actor_type: actorType,
        status: { in: [RestrictionStatus.BLOCKED, RestrictionStatus.LIMITED] },
        OR: [{ ends_at: null }, { ends_at: { gt: now } }],
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async ensureDriverCanGoOnline(userId: string) {
    const active = await this.getActiveRestriction(userId, ActorType.DRIVER);
    if (active?.status === RestrictionStatus.BLOCKED) {
      throw new ForbiddenException(`Driver blocked by restriction until ${active.ends_at?.toISOString() ?? 'manual lift required'}`);
    }
    return { isLimited: active?.status === RestrictionStatus.LIMITED };
  }

  async applyScoreEvent(input: {
    user_id: string;
    actor_type: ActorType;
    type: ScoreEventType;
    delta: number;
    trip_id?: string;
    safety_alert_id?: string;
    payload?: unknown;
  }) {
    const current = await this.getOrCreateUserScore(input.user_id, input.actor_type);
    const nextScore = Math.max(0, Math.min(100, current.score + input.delta));
    const nextStatus = this.mapStatus(nextScore);

    const result = await this.prisma.$transaction(async (trx) => {
      const updatedScore = await trx.userScore.update({
        where: { user_id_actor_type: { user_id: input.user_id, actor_type: input.actor_type } },
        data: { score: nextScore, status: nextStatus, last_changed_at: new Date() },
      });

      const event = await trx.scoreEvent.create({
        data: {
          user_id: input.user_id,
          actor_type: input.actor_type,
          type: input.type,
          delta: input.delta,
          trip_id: input.trip_id,
          safety_alert_id: input.safety_alert_id,
          payload_json: (input.payload ?? {}) as any,
        },
      });

      let autoRestriction = null;
      if (nextStatus === RestrictionStatus.BLOCKED && current.status !== RestrictionStatus.BLOCKED) {
        autoRestriction = await trx.userRestriction.create({
          data: {
            user_id: input.user_id,
            actor_type: input.actor_type,
            status: RestrictionStatus.BLOCKED,
            reason: RestrictionReason.LOW_SCORE_AUTO,
            starts_at: new Date(),
            ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            notes: 'Auto-block due to low Zippy Score',
          },
        });
      }

      return { updatedScore, event, autoRestriction };
    });

    const channel = input.actor_type === ActorType.DRIVER ? 'driver.restriction.updated' : 'passenger.restriction.updated';
    this.ws.emitToUser(input.user_id, channel, {
      user_id: input.user_id,
      actor_type: input.actor_type,
      score: result.updatedScore.score,
      status: result.updatedScore.status,
      restriction: result.autoRestriction,
    });
    this.ws.emitSosAlert('sos.alert.updated', {
      kind: 'score_event',
      user_id: input.user_id,
      actor_type: input.actor_type,
      score: result.updatedScore.score,
      status: result.updatedScore.status,
      type: input.type,
      delta: input.delta,
    });

    await this.merit.updateBadge(input.user_id, input.actor_type, result.updatedScore.score);
    return result;
  }

  async listScores(actorType?: ActorType, status?: RestrictionStatus, q?: string) {
    const where: any = {};
    if (actorType) where.actor_type = actorType;
    if (status) where.status = status;
    if (q) where.user_id = { contains: q };

    const rows = await this.prisma.userScore.findMany({ where, orderBy: [{ score: 'asc' }, { updated_at: 'desc' }], take: 200 });
    const now = new Date();
    const restrictions = await this.prisma.userRestriction.findMany({
      where: { OR: [{ ends_at: null }, { ends_at: { gt: now } }], status: { in: [RestrictionStatus.BLOCKED, RestrictionStatus.LIMITED] } },
      orderBy: { created_at: 'desc' },
    });
    const byKey = new Map(restrictions.map((r) => [`${r.user_id}:${r.actor_type}`, r]));
    const badges = await this.prisma.userBadge.findMany({ where: { OR: rows.map((r) => ({ user_id: r.user_id, actor_type: r.actor_type })) } });
    const badgeByKey = new Map(badges.map((b) => [`${b.user_id}:${b.actor_type}`, b]));

    return rows.map((r) => ({ ...r, badge: badgeByKey.get(`${r.user_id}:${r.actor_type}`) ?? null, restriction_active: byKey.get(`${r.user_id}:${r.actor_type}`) ?? null }));
  }

  async getUserScoreDetail(userId: string, actorType: ActorType) {
    const score = await this.getOrCreateUserScore(userId, actorType);
    const [events, restrictions, badge] = await Promise.all([
      this.prisma.scoreEvent.findMany({ where: { user_id: userId, actor_type: actorType }, orderBy: { created_at: 'desc' }, take: 50 }),
      this.prisma.userRestriction.findMany({ where: { user_id: userId, actor_type: actorType }, orderBy: { created_at: 'desc' }, take: 50 }),
      this.prisma.userBadge.findUnique({ where: { user_id_actor_type: { user_id: userId, actor_type: actorType } } }),
    ]);
    return { score, badge, events, restrictions };
  }

  async createManualRestriction(input: {
    user_id: string;
    actor_type: ActorType;
    status: RestrictionStatus;
    reason: RestrictionReason;
    ends_at?: Date;
    notes?: string;
    created_by_user_id: string;
  }) {
    await this.getOrCreateUserScore(input.user_id, input.actor_type);
    const restriction = await this.prisma.userRestriction.create({
      data: {
        user_id: input.user_id,
        actor_type: input.actor_type,
        status: input.status,
        reason: input.reason,
        starts_at: new Date(),
        ends_at: input.ends_at,
        notes: input.notes,
        created_by_user_id: input.created_by_user_id,
      },
    });

    await this.applyScoreEvent({
      user_id: input.user_id,
      actor_type: input.actor_type,
      type: ScoreEventType.MANUAL_ADJUST,
      delta: 0,
      payload: { action: 'manual_restriction', restriction_id: restriction.id, reason: input.reason, notes: input.notes ?? null },
    });

    return restriction;
  }

  async liftRestriction(id: string, actorUserId: string) {
    const restriction = await this.prisma.userRestriction.update({ where: { id }, data: { ends_at: new Date() } });
    await this.applyScoreEvent({
      user_id: restriction.user_id,
      actor_type: restriction.actor_type,
      type: ScoreEventType.MANUAL_ADJUST,
      delta: 0,
      payload: { action: 'lift_restriction', restriction_id: restriction.id, by: actorUserId },
    });
    return restriction;
  }

  async adjustScore(userId: string, actorType: ActorType, delta: number, notes: string | undefined, actorUserId: string) {
    const result = await this.applyScoreEvent({
      user_id: userId,
      actor_type: actorType,
      type: ScoreEventType.MANUAL_ADJUST,
      delta,
      payload: { notes: notes ?? null, by: actorUserId },
    });
    return result.updatedScore;
  }

  async applyRecoveryOnTripCompletion(userId: string, actorType: ActorType) {
    const rules = (await this.prisma.appConfig.findUnique({ where: { key: 'recovery_rules' } }))?.value_json as any ?? { limited_clean_trips: 5, limited_bonus: 5, blocked_clean_trips: 3, daily_cap: 6 };
    const score = await this.getOrCreateUserScore(userId, actorType);
    if (![RestrictionStatus.LIMITED, RestrictionStatus.BLOCKED].includes(score.status)) return;

    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const clean = await this.prisma.scoreEvent.count({ where: { user_id: userId, actor_type: actorType, type: ScoreEventType.TRIP_COMPLETED_CLEAN, created_at: { gte: since } } });

    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const gainedToday = await this.prisma.scoreEvent.aggregate({ _sum: { delta: true }, where: { user_id: userId, actor_type: actorType, type: ScoreEventType.TRIP_RECOVERY_BONUS, created_at: { gte: dayStart } } });
    const used = gainedToday._sum.delta ?? 0;
    const cap = rules.daily_cap ?? 6;
    if (used >= cap) return;

    if (score.status === RestrictionStatus.LIMITED && clean >= (rules.limited_clean_trips ?? 5)) {
      const delta = Math.min(rules.limited_bonus ?? 5, cap - used);
      if (delta > 0) await this.applyScoreEvent({ user_id: userId, actor_type: actorType, type: ScoreEventType.TRIP_RECOVERY_BONUS, delta, payload: { reason: 'limited_recovery' } });
    }

    if (score.status === RestrictionStatus.BLOCKED) {
      const auto = await this.prisma.userRestriction.findFirst({ where: { user_id: userId, actor_type: actorType, reason: RestrictionReason.LOW_SCORE_AUTO }, orderBy: { created_at: 'desc' } });
      if (auto && auto.ends_at && auto.ends_at <= new Date() && clean >= (rules.blocked_clean_trips ?? 3)) {
        const delta = Math.min(5, cap - used);
        if (delta > 0) await this.applyScoreEvent({ user_id: userId, actor_type: actorType, type: ScoreEventType.TRIP_RECOVERY_BONUS, delta, payload: { reason: 'blocked_recovery' } });
      }
    }
  }
}
