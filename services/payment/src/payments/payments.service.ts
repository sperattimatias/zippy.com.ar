import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { LedgerActor, LedgerEntryType, PaymentStatus, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(private readonly prisma: PrismaService) {}

  private toInt(v: bigint | number) { return Number(v); }

  async getActiveCommissionBps(driverUserId: string, at: Date) {
    const defaultRow = await this.prisma.commissionPolicy.findUnique({ where: { key: 'default_commission_bps' } });
    const bonusRow = await this.prisma.monthlyBonusLedger.findFirst({
      where: { driver_user_id: driverUserId, status: 'ACTIVE', starts_at: { lte: at }, ends_at: { gte: at } },
      orderBy: { starts_at: 'desc' },
    });
    const rulesRow = await this.prisma.commissionPolicy.findUnique({ where: { key: 'bonus_rules' } });
    const defaultBps = Number(defaultRow?.value_json ?? 1000);
    const floor = Number((rulesRow?.value_json as any)?.commission_floor_bps ?? 200);
    const discount = bonusRow?.discount_bps ?? 0;
    return { default_bps: defaultBps, discount_bps: discount, effective_bps: Math.max(defaultBps - discount, floor) };
  }

  async createPreference(passengerUserId: string, tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new BadRequestException('Trip not found');
    if (trip.status !== 'COMPLETED') throw new BadRequestException('Trip must be completed');
    if (trip.passenger_user_id !== passengerUserId) throw new ForbiddenException('Not trip passenger');
    if (!trip.driver_user_id) throw new BadRequestException('Trip missing driver');
    if (!trip.price_final || trip.price_final <= 0) throw new BadRequestException('Trip has no final price');

    const existing = await this.prisma.tripPayment.findUnique({ where: { trip_id: tripId } });
    if (existing) throw new BadRequestException('Trip payment already exists');

    const driver = await this.prisma.driverProfile.findUnique({ where: { user_id: trip.driver_user_id } });
    if (!driver?.mp_account_id) throw new BadRequestException('Driver has no MercadoPago account connected');

    const commission = await this.getActiveCommissionBps(trip.driver_user_id, trip.completed_at ?? new Date());
    const total = trip.price_final;
    const commissionAmount = Math.floor((total * commission.effective_bps) / 10000);
    const driverNet = total - commissionAmount;

    const prefId = `pref_${trip.id}_${Date.now()}`;
    const initPoint = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${prefId}`;

    const payment = await this.prisma.tripPayment.create({
      data: {
        trip_id: trip.id,
        passenger_user_id: passengerUserId,
        driver_user_id: trip.driver_user_id,
        amount_total: total,
        currency: trip.currency || 'ARS',
        commission_bps_applied: commission.effective_bps,
        commission_amount: commissionAmount,
        driver_net_amount: driverNet,
        mp_preference_id: prefId,
        status: PaymentStatus.CREATED,
        settlement_status: SettlementStatus.NOT_SETTLED,
      },
    });

    return { payment_id: payment.id, mp_preference_id: prefId, init_point: initPoint, amount_total: total, commission_amount: commissionAmount, driver_net_amount: driverNet };
  }

  private verifyWebhookSignature(body: string, signature?: string) {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) return true;
    if (!signature) return false;
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    return expected === signature;
  }

  async processWebhook(rawBody: string, signature: string | undefined, payload: any) {
    if (!this.verifyWebhookSignature(rawBody, signature)) throw new ForbiddenException('Invalid MP signature');
    const paymentId = payload?.data?.id ? String(payload.data.id) : undefined;
    const externalRef = payload?.external_reference ?? payload?.data?.external_reference;
    if (!paymentId && !externalRef) throw new BadRequestException('payment reference missing');

    const tripPayment = paymentId
      ? await this.prisma.tripPayment.findFirst({ where: { OR: [{ mp_payment_id: paymentId }, { mp_preference_id: payload?.preference_id }] } })
      : await this.prisma.tripPayment.findUnique({ where: { trip_id: String(externalRef) } });
    if (!tripPayment) throw new BadRequestException('TripPayment not found');

    const normalizedStatus = String(payload?.status ?? '').toUpperCase();
    if (tripPayment.status === PaymentStatus.APPROVED) return { ok: true, idempotent: true };

    if (normalizedStatus === 'APPROVED') {
      await this.prisma.$transaction(async (trx) => {
        await trx.tripPayment.update({ where: { id: tripPayment.id }, data: { status: PaymentStatus.APPROVED, settlement_status: SettlementStatus.SETTLED, mp_payment_id: paymentId ?? tripPayment.mp_payment_id } });

        const existing = await trx.ledgerEntry.count({ where: { trip_id: tripPayment.trip_id, type: LedgerEntryType.DRIVER_EARNING } });
        if (existing > 0) return;

        await trx.ledgerEntry.createMany({
          data: [
            { actor_type: LedgerActor.PLATFORM, actor_user_id: null, trip_id: tripPayment.trip_id, type: LedgerEntryType.PLATFORM_COMMISSION, amount: tripPayment.commission_amount, reference_id: paymentId ?? null },
            { actor_type: LedgerActor.DRIVER, actor_user_id: tripPayment.driver_user_id, trip_id: tripPayment.trip_id, type: LedgerEntryType.DRIVER_EARNING, amount: tripPayment.driver_net_amount, reference_id: paymentId ?? null },
            { actor_type: LedgerActor.DRIVER, actor_user_id: tripPayment.driver_user_id, trip_id: tripPayment.trip_id, type: LedgerEntryType.TRIP_REVENUE, amount: tripPayment.amount_total, reference_id: paymentId ?? null },
            { actor_type: LedgerActor.PLATFORM, actor_user_id: null, trip_id: tripPayment.trip_id, type: LedgerEntryType.BONUS_DISCOUNT, amount: Math.max(0, Math.floor((tripPayment.amount_total * ((await this.getActiveCommissionBps(tripPayment.driver_user_id, new Date())).discount_bps)) / 10000)), reference_id: paymentId ?? null },
          ],
        });

        const summary = await trx.driverPayoutSummary.findUnique({ where: { driver_user_id: tripPayment.driver_user_id } });
        const data = {
          total_gross: BigInt((summary?.total_gross ?? BigInt(0)) + BigInt(tripPayment.amount_total)),
          total_commission: BigInt((summary?.total_commission ?? BigInt(0)) + BigInt(tripPayment.commission_amount)),
          total_bonus_discount: BigInt(summary?.total_bonus_discount ?? BigInt(0)),
          total_net: BigInt((summary?.total_net ?? BigInt(0)) + BigInt(tripPayment.driver_net_amount)),
        };
        await trx.driverPayoutSummary.upsert({ where: { driver_user_id: tripPayment.driver_user_id }, update: data, create: { driver_user_id: tripPayment.driver_user_id, ...data } });
      });
      return { ok: true, status: PaymentStatus.APPROVED };
    }

    if (['REJECTED', 'CANCELLED'].includes(normalizedStatus)) {
      await this.prisma.tripPayment.update({ where: { id: tripPayment.id }, data: { status: PaymentStatus.REJECTED, settlement_status: SettlementStatus.FAILED, mp_payment_id: paymentId ?? tripPayment.mp_payment_id } });
      return { ok: true, status: PaymentStatus.REJECTED };
    }

    await this.prisma.tripPayment.update({ where: { id: tripPayment.id }, data: { status: PaymentStatus.PENDING, mp_payment_id: paymentId ?? tripPayment.mp_payment_id } });
    return { ok: true, status: PaymentStatus.PENDING };
  }

  async driverFinanceSummary(driverUserId: string) {
    const summary = await this.prisma.driverPayoutSummary.findUnique({ where: { driver_user_id: driverUserId } });
    const from = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const last30 = await this.prisma.tripPayment.aggregate({
      _sum: { amount_total: true, commission_amount: true, driver_net_amount: true },
      where: { driver_user_id: driverUserId, created_at: { gte: from }, status: PaymentStatus.APPROVED },
    });
    return {
      total_gross: this.toInt(summary?.total_gross ?? 0),
      total_commission: this.toInt(summary?.total_commission ?? 0),
      total_bonus_discount: this.toInt(summary?.total_bonus_discount ?? 0),
      total_net: this.toInt(summary?.total_net ?? 0),
      last_30_days: {
        gross: last30._sum.amount_total ?? 0,
        commission: last30._sum.commission_amount ?? 0,
        net: last30._sum.driver_net_amount ?? 0,
      },
    };
  }

  async driverFinanceTrips(driverUserId: string) {
    return this.prisma.tripPayment.findMany({ where: { driver_user_id: driverUserId }, orderBy: { created_at: 'desc' }, take: 200 });
  }

  async adminFinanceTrips(filter: { status?: PaymentStatus; driver?: string; from?: string; to?: string }) {
    return this.prisma.tripPayment.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.driver ? { driver_user_id: filter.driver } : {}),
        ...(filter.from || filter.to ? { created_at: { ...(filter.from ? { gte: new Date(filter.from) } : {}), ...(filter.to ? { lte: new Date(filter.to) } : {}) } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 500,
    });
  }

  async adminLedger(actorType?: LedgerActor) {
    return this.prisma.ledgerEntry.findMany({ where: actorType ? { actor_type: actorType } : {}, orderBy: { created_at: 'desc' }, take: 1000 });
  }

  async adminReconciliation(date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    const approved = await this.prisma.tripPayment.count({ where: { status: PaymentStatus.APPROVED, updated_at: { gte: start, lte: end } } });
    const settled = await this.prisma.tripPayment.count({ where: { settlement_status: SettlementStatus.SETTLED, updated_at: { gte: start, lte: end } } });
    return { date, approved_internal: approved, settled_internal: settled, drift: approved - settled, notes: 'MP API reconciliation adapter pending credentials; internal consistency check performed' };
  }
}
