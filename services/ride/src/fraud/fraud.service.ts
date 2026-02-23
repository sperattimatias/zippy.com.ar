import { Injectable } from '@nestjs/common';
import { ActorType, FraudCaseStatus, FraudSeverity, FraudSignalType, HoldStatus, HoldType } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RideGateway } from '../ride/ride.gateway';

@Injectable()
export class FraudService {
  constructor(private readonly prisma: PrismaService, private readonly ws: RideGateway) {}

  private hash(v?: string | null) {
    if (!v) return null;
    return createHash('sha256').update(v).digest('hex');
  }

  private riskLevel(score: number) {
    if (score >= 80) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 20) return 'MEDIUM';
    return 'LOW';
  }

  async captureFingerprint(userId: string, actorType: ActorType, headers: { ip?: string; ua?: string; device?: string }) {
    return this.prisma.clientFingerprint.create({
      data: {
        user_id: userId,
        actor_type: actorType,
        ip_hash: this.hash(headers.ip) ?? this.hash('unknown')!,
        user_agent_hash: this.hash(headers.ua) ?? this.hash('unknown')!,
        device_fingerprint_hash: this.hash(headers.device),
      },
    });
  }

  async applySignal(input: { user_id?: string; trip_id?: string; payment_id?: string; type: FraudSignalType; severity: FraudSeverity; score_delta: number; payload?: unknown }) {
    const signal = await this.prisma.fraudSignal.create({ data: { user_id: input.user_id, trip_id: input.trip_id, payment_id: input.payment_id, type: input.type, severity: input.severity, score_delta: input.score_delta, payload_json: (input.payload ?? {}) as any } });

    if (input.user_id) {
      const current = await this.prisma.financialRiskScore.upsert({ where: { user_id: input.user_id }, update: {}, create: { user_id: input.user_id } });
      const nextScore = Math.max(0, Math.min(100, current.score + input.score_delta));
      const nextLevel = this.riskLevel(nextScore);
      await this.prisma.financialRiskScore.update({ where: { user_id: input.user_id }, data: { score: nextScore, level: nextLevel } });

      if (nextLevel === 'HIGH') {
        await this.createHoldIfAbsent(input.user_id, HoldType.FEATURE_LIMIT, 'Auto hold by high financial risk', 48);
      }
      if (nextLevel === 'CRITICAL') {
        await this.createHoldIfAbsent(input.user_id, HoldType.PAYOUT_HOLD, 'Auto payout hold by critical financial risk');
      }
    }

    const fraudCase = await this.createOrAttachCase(signal);
    this.ws.emitSosAlert('admin.fraud.case.created', { case_id: fraudCase.id, severity: fraudCase.severity, title: fraudCase.title });
    return { signal, fraud_case: fraudCase };
  }

  private async createOrAttachCase(signal: any) {
    const existing = await this.prisma.fraudCase.findFirst({ where: { status: { in: [FraudCaseStatus.OPEN, FraudCaseStatus.IN_REVIEW] }, primary_user_id: signal.user_id ?? undefined }, orderBy: { created_at: 'desc' } });
    const fraudCase = existing ?? await this.prisma.fraudCase.create({
      data: {
        primary_user_id: signal.user_id,
        severity: signal.severity,
        title: `Fraud signal: ${signal.type}`,
        summary: `Auto-created from ${signal.type}`,
        related_trip_ids: signal.trip_id ? [signal.trip_id] as any : null,
        related_user_ids: signal.user_id ? [signal.user_id] as any : null,
        related_payment_ids: signal.payment_id ? [signal.payment_id] as any : null,
      },
    });
    await this.prisma.fraudCaseSignalLink.upsert({
      where: { fraud_case_id_fraud_signal_id: { fraud_case_id: fraudCase.id, fraud_signal_id: signal.id } },
      update: {},
      create: { fraud_case_id: fraudCase.id, fraud_signal_id: signal.id },
    });
    return fraudCase;
  }

  async createHoldIfAbsent(userId: string, holdType: HoldType, reason: string, hours?: number, createdBy?: string, payload?: unknown) {
    const now = new Date();
    const active = await this.prisma.userHold.findFirst({ where: { user_id: userId, hold_type: holdType, status: HoldStatus.ACTIVE, OR: [{ ends_at: null }, { ends_at: { gt: now } }] } });
    if (active) return active;
    const hold = await this.prisma.userHold.create({
      data: {
        user_id: userId,
        hold_type: holdType,
        status: HoldStatus.ACTIVE,
        reason,
        starts_at: now,
        ends_at: hours ? new Date(now.getTime() + hours * 3600 * 1000) : null,
        created_by_user_id: createdBy,
        payload_json: (payload ?? {}) as any,
      },
    });
    this.ws.emitToUser(userId, 'user.hold.applied', hold);
    return hold;
  }

  async releaseHold(id: string, byUserId?: string) {
    const hold = await this.prisma.userHold.update({ where: { id }, data: { status: HoldStatus.RELEASED, ends_at: new Date(), created_by_user_id: byUserId ?? undefined } });
    this.ws.emitToUser(hold.user_id, 'user.hold.released', hold);
    return hold;
  }

  async listCases(filter: { status?: FraudCaseStatus; severity?: FraudSeverity; q?: string }) {
    return this.prisma.fraudCase.findMany({ where: { ...(filter.status ? { status: filter.status } : {}), ...(filter.severity ? { severity: filter.severity } : {}), ...(filter.q ? { OR: [{ title: { contains: filter.q } }, { summary: { contains: filter.q } }] } : {}) }, orderBy: { created_at: 'desc' }, take: 300 });
  }

  async getCase(id: string) {
    const fraudCase = await this.prisma.fraudCase.findUnique({ where: { id } });
    const links = await this.prisma.fraudCaseSignalLink.findMany({ where: { fraud_case_id: id }, orderBy: { created_at: 'desc' } });
    const signals = await this.prisma.fraudSignal.findMany({ where: { id: { in: links.map((l) => l.fraud_signal_id) } } });
    return { fraud_case: fraudCase, signals };
  }

  async assignCase(id: string, assignedToUserId: string) {
    return this.prisma.fraudCase.update({ where: { id }, data: { status: FraudCaseStatus.IN_REVIEW, assigned_to_user_id: assignedToUserId } });
  }

  async resolveCase(id: string, notes: string) {
    return this.prisma.fraudCase.update({ where: { id }, data: { status: FraudCaseStatus.RESOLVED, summary: notes || 'resolved' } });
  }

  async dismissCase(id: string, notes: string) {
    return this.prisma.fraudCase.update({ where: { id }, data: { status: FraudCaseStatus.DISMISSED, summary: notes || 'dismissed' } });
  }

  async userRisk(userId: string) {
    const [risk, holds, signals] = await Promise.all([
      this.prisma.financialRiskScore.findUnique({ where: { user_id: userId } }),
      this.prisma.userHold.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, take: 20 }),
      this.prisma.fraudSignal.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, take: 50 }),
    ]);
    return { risk, holds, signals };
  }

  async runPeriodicDetections() {
    const thresholds = (await this.prisma.appConfig.findUnique({ where: { key: 'fraud_thresholds' } }))?.value_json as any ?? { shared_ip_users_24h: 6, shared_device_users_24h: 3 };
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const fps = await this.prisma.clientFingerprint.findMany({ where: { created_at: { gte: since } } });
    const byIp = new Map<string, Set<string>>();
    const byDevice = new Map<string, Set<string>>();
    for (const fp of fps) {
      if (!byIp.has(fp.ip_hash)) byIp.set(fp.ip_hash, new Set());
      byIp.get(fp.ip_hash)!.add(fp.user_id);
      if (fp.device_fingerprint_hash) {
        if (!byDevice.has(fp.device_fingerprint_hash)) byDevice.set(fp.device_fingerprint_hash, new Set());
        byDevice.get(fp.device_fingerprint_hash)!.add(fp.user_id);
      }
    }

    for (const [, users] of byIp) {
      if (users.size > (thresholds.shared_ip_users_24h ?? 6)) {
        for (const user of users) {
          await this.applySignal({ user_id: user, type: FraudSignalType.SHARED_IP_MULTIPLE_USERS, severity: FraudSeverity.MEDIUM, score_delta: 8, payload: { users: users.size } });
        }
      }
    }
    for (const [, users] of byDevice) {
      if (users.size > (thresholds.shared_device_users_24h ?? 3)) {
        for (const user of users) {
          await this.applySignal({ user_id: user, type: FraudSignalType.SHARED_DEVICE_FINGERPRINT, severity: users.size > 5 ? FraudSeverity.CRITICAL : FraudSeverity.HIGH, score_delta: users.size > 5 ? 30 : 20, payload: { users: users.size } });
        }
      }
    }
  }
}
