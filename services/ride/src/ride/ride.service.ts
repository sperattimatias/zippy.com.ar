import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  CancelReason,
  DriverPresence,
  TripActor,
  TripBidStatus,
  TripStatus,
  VehicleCategory,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RideGateway } from './ride.gateway';
import {
  AcceptBidDto,
  CancelDto,
  CreateBidDto,
  LocationDto,
  PresenceOnlineDto,
  PresencePingDto,
  RateTripDto,
  TripRequestDto,
  VerifyOtpDto,
} from '../dto/ride.dto';

@Injectable()
export class RideService implements OnModuleInit {
  private locationThrottle = new Map<string, number>();

  constructor(private readonly prisma: PrismaService, private readonly ws: RideGateway) {}

  onModuleInit() {
    setInterval(() => void this.autoMatchExpiredBiddingTrips(), 1000);
  }

  private nowMs() { return Date.now(); }
  private otpHash(otp: string) { return createHash('sha256').update(otp).digest('hex'); }
  private otpGenerate() { return `${Math.floor(100000 + Math.random() * 900000)}`; }
  private onlineRecent(lastSeen?: Date | null) { return !!lastSeen && (this.nowMs() - lastSeen.getTime() < 30_000); }

  private async addEvent(tripId: string, actorUserId: string | null, type: string, payload: unknown) {
    await this.prisma.tripEvent.create({ data: { trip_id: tripId, actor_user_id: actorUserId, type, payload_json: payload as any } });
  }

  private haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
    const r = 6371;
    const dLat = (bLat - aLat) * (Math.PI / 180);
    const dLng = (bLng - aLng) * (Math.PI / 180);
    const aa = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * r * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  }

  private computeBasePrice(distanceKm?: number, etaMin?: number) {
    const fixed = 800;
    const kmRate = 250;
    const minRate = 80;
    const km = distanceKm ?? 5;
    const eta = etaMin ?? 10;
    return Math.round(fixed + km * kmRate + eta * minRate);
  }

  async presenceOnline(driverUserId: string, dto: PresenceOnlineDto) {
    const presence = await this.prisma.driverPresence.upsert({
      where: { driver_user_id: driverUserId },
      update: { is_online: true, last_lat: dto.lat, last_lng: dto.lng, last_seen_at: new Date(), vehicle_category: dto.category },
      create: { driver_user_id: driverUserId, is_online: true, last_lat: dto.lat, last_lng: dto.lng, last_seen_at: new Date(), vehicle_category: dto.category },
    });
    return presence;
  }

  async presenceOffline(driverUserId: string) {
    await this.prisma.driverPresence.updateMany({ where: { driver_user_id: driverUserId }, data: { is_online: false } });
    return { message: 'offline' };
  }

  async presencePing(driverUserId: string, dto: PresencePingDto) {
    await this.prisma.driverPresence.updateMany({ where: { driver_user_id: driverUserId }, data: { last_lat: dto.lat, last_lng: dto.lng, last_seen_at: new Date() } });
    return { message: 'pong' };
  }

  async requestTrip(passengerUserId: string, dto: TripRequestDto) {
    const price_base = this.computeBasePrice(dto.distance_km, dto.eta_minutes);
    const expires = new Date(this.nowMs() + 45_000);

    const trip = await this.prisma.trip.create({
      data: {
        passenger_user_id: passengerUserId,
        status: TripStatus.BIDDING,
        origin_lat: dto.origin_lat,
        origin_lng: dto.origin_lng,
        origin_address: dto.origin_address,
        dest_lat: dto.dest_lat,
        dest_lng: dto.dest_lng,
        dest_address: dto.dest_address,
        distance_km: dto.distance_km,
        eta_minutes: dto.eta_minutes,
        price_base,
        bidding_expires_at: expires,
      },
    });

    await this.addEvent(trip.id, passengerUserId, 'trip.created', { price_base });
    await this.addEvent(trip.id, passengerUserId, 'trip.bidding.started', { bidding_expires_at: expires.toISOString() });

    this.ws.emitTrip(trip.id, 'trip.created', { trip_id: trip.id, status: trip.status });

    const presences = await this.prisma.driverPresence.findMany({ where: { is_online: true, vehicle_category: dto.category } });
    const activeNearby = presences
      .filter((p) => this.onlineRecent(p.last_seen_at))
      .map((p) => ({ p, distance: this.haversineKm(dto.origin_lat, dto.origin_lng, p.last_lat ?? dto.origin_lat, p.last_lng ?? dto.origin_lng) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    for (const { p } of activeNearby) {
      this.ws.emitToDriver(p.driver_user_id, 'trip.bidding.started', {
        trip_id: trip.id,
        origin_address: trip.origin_address,
        dest_address: trip.dest_address,
        price_base: trip.price_base,
        bidding_expires_at: trip.bidding_expires_at,
      });
    }

    return trip;
  }

  async createBid(tripId: string, driverUserId: string, dto: CreateBidDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== TripStatus.BIDDING) throw new BadRequestException('Trip is not in bidding');

    const presence = await this.prisma.driverPresence.findUnique({ where: { driver_user_id: driverUserId } });
    if (!presence || !presence.is_online || !this.onlineRecent(presence.last_seen_at)) throw new ForbiddenException('Driver is offline');

    const min = Math.round(trip.price_base * 0.7);
    const max = Math.round(trip.price_base * 2.0);
    if (dto.price_offer < min || dto.price_offer > max) throw new BadRequestException('Price offer out of allowed range');

    const bid = await this.prisma.tripBid.create({
      data: {
        trip_id: tripId,
        driver_user_id: driverUserId,
        price_offer: dto.price_offer,
        eta_to_pickup_minutes: dto.eta_to_pickup_minutes,
      },
    });

    await this.addEvent(trip.id, driverUserId, 'trip.bid.received', { bid_id: bid.id, price_offer: bid.price_offer });
    this.ws.emitTrip(trip.id, 'trip.bid.received', { bid_id: bid.id, driver_user_id: driverUserId, price_offer: bid.price_offer });
    return bid;
  }

  async acceptBid(tripId: string, passengerUserId: string, dto: AcceptBidDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.passenger_user_id !== passengerUserId) throw new ForbiddenException('Not trip passenger');
    if (trip.status !== TripStatus.BIDDING) throw new BadRequestException('Trip is not in bidding');

    const bid = await this.prisma.tripBid.findUnique({ where: { id: dto.bid_id } });
    if (!bid || bid.trip_id !== tripId || bid.status !== TripBidStatus.PENDING) throw new BadRequestException('Invalid bid');

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.MATCHED, driver_user_id: bid.driver_user_id, price_final: bid.price_offer, matched_at: new Date() },
    });

    await this.prisma.tripBid.updateMany({ where: { trip_id: tripId, id: { not: bid.id }, status: TripBidStatus.PENDING }, data: { status: TripBidStatus.REJECTED } });
    await this.prisma.tripBid.update({ where: { id: bid.id }, data: { status: TripBidStatus.ACCEPTED } });

    await this.addEvent(tripId, passengerUserId, 'trip.matched', { bid_id: bid.id, driver_user_id: bid.driver_user_id });
    this.ws.emitTrip(tripId, 'trip.matched', { trip_id: tripId, driver_user_id: bid.driver_user_id, price_final: updated.price_final });
    this.ws.emitToDriver(bid.driver_user_id, 'trip.matched', { trip_id: tripId, passenger_user_id: passengerUserId });

    return updated;
  }

  async autoMatchExpiredBiddingTrips() {
    const now = new Date();
    const trips = await this.prisma.trip.findMany({ where: { status: TripStatus.BIDDING, bidding_expires_at: { lt: now } } });
    for (const trip of trips) {
      const bids = await this.prisma.tripBid.findMany({ where: { trip_id: trip.id, status: TripBidStatus.PENDING } });
      if (!bids.length) {
        const updated = await this.prisma.trip.updateMany({ where: { id: trip.id, status: TripStatus.BIDDING }, data: { status: TripStatus.EXPIRED_NO_DRIVER } });
        if (updated.count === 0) continue;
        await this.addEvent(trip.id, null, 'trip.expired_no_driver', {});
        this.ws.emitTrip(trip.id, 'trip.cancelled', { trip_id: trip.id, status: TripStatus.EXPIRED_NO_DRIVER });
        continue;
      }

      const best = bids
        .map((b) => ({ b, score: b.price_offer + ((b.eta_to_pickup_minutes ?? 0) * 10) }))
        .sort((a, b) => a.score - b.score)[0].b;

      // IMPORTANT: AutoMatch must be idempotent and safe under concurrency
      const tx = await this.prisma.$transaction(async (trx) => {
        const claim = await trx.trip.updateMany({
          where: { id: trip.id, status: TripStatus.BIDDING },
          data: {
            status: TripStatus.MATCHED,
            driver_user_id: best.driver_user_id,
            price_final: best.price_offer,
            matched_at: new Date(),
          },
        });

        if (claim.count === 0) {
          return { matched: false as const };
        }

        await trx.tripBid.updateMany({ where: { trip_id: trip.id, id: { not: best.id }, status: TripBidStatus.PENDING }, data: { status: TripBidStatus.REJECTED } });
        await trx.tripBid.update({ where: { id: best.id }, data: { status: TripBidStatus.AUTO_SELECTED } });

        return { matched: true as const };
      });

      if (!tx.matched) continue;

      await this.addEvent(trip.id, null, 'trip.matched', { bid_id: best.id, auto_selected: true });
      this.ws.emitTrip(trip.id, 'trip.matched', { trip_id: trip.id, driver_user_id: best.driver_user_id, auto_selected: true });
    }
  }

  private async getTripForDriver(tripId: string, driverUserId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driver_user_id !== driverUserId) throw new ForbiddenException('Not assigned driver');
    return trip;
  }

  async driverEnRoute(tripId: string, driverUserId: string) {
    const trip = await this.getTripForDriver(tripId, driverUserId);
    if (trip.status !== TripStatus.MATCHED) throw new BadRequestException('Invalid transition');
    const updated = await this.prisma.trip.update({ where: { id: tripId }, data: { status: TripStatus.DRIVER_EN_ROUTE } });
    await this.addEvent(tripId, driverUserId, 'trip.driver.en_route', {});
    this.ws.emitTrip(tripId, 'trip.driver.en_route', { trip_id: tripId });
    return updated;
  }

  async driverArrived(tripId: string, driverUserId: string) {
    const trip = await this.getTripForDriver(tripId, driverUserId);
    if (trip.status !== TripStatus.DRIVER_EN_ROUTE) throw new BadRequestException('Invalid transition');
    await this.prisma.trip.update({ where: { id: tripId }, data: { status: TripStatus.OTP_PENDING } });
    const otp = this.otpGenerate();
    await this.prisma.tripOtp.upsert({
      where: { trip_id: tripId },
      update: { otp_hash: this.otpHash(otp), expires_at: new Date(this.nowMs() + 10 * 60 * 1000), attempts: 0, verified_at: null },
      create: { trip_id: tripId, otp_hash: this.otpHash(otp), expires_at: new Date(this.nowMs() + 10 * 60 * 1000), attempts: 0 },
    });

    await this.addEvent(tripId, driverUserId, 'trip.arrived', {});
    this.ws.emitTrip(tripId, 'trip.arrived', { trip_id: tripId });
    this.ws.emitToUser(trip.passenger_user_id, 'trip.otp.generated', { trip_id: tripId, otp });
    return { message: 'arrived', otp_visible_for_passenger_in_event: true };
  }

  async verifyOtp(tripId: string, driverUserId: string, dto: VerifyOtpDto) {
    const trip = await this.getTripForDriver(tripId, driverUserId);
    if (trip.status !== TripStatus.OTP_PENDING) throw new BadRequestException('Invalid transition');
    const otp = await this.prisma.tripOtp.findUnique({ where: { trip_id: tripId } });
    if (!otp) throw new BadRequestException('OTP not found');
    if (otp.expires_at < new Date()) throw new BadRequestException('OTP expired');
    if (otp.attempts >= 5) throw new ForbiddenException('OTP attempts exceeded');

    if (this.otpHash(dto.otp) !== otp.otp_hash) {
      await this.prisma.tripOtp.update({ where: { trip_id: tripId }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.tripOtp.update({ where: { trip_id: tripId }, data: { verified_at: new Date() } });
    const updated = await this.prisma.trip.update({ where: { id: tripId }, data: { status: TripStatus.IN_PROGRESS, started_at: new Date() } });
    await this.addEvent(tripId, driverUserId, 'trip.started', {});
    this.ws.emitTrip(tripId, 'trip.started', { trip_id: tripId });
    return updated;
  }

  async trackLocation(tripId: string, driverUserId: string, dto: LocationDto) {
    const trip = await this.getTripForDriver(tripId, driverUserId);
    if (![TripStatus.DRIVER_EN_ROUTE, TripStatus.IN_PROGRESS].includes(trip.status)) throw new BadRequestException('Invalid status for location');

    const key = `${tripId}:${driverUserId}`;
    const last = this.locationThrottle.get(key) ?? 0;
    if (this.nowMs() - last < 2000) throw new BadRequestException('Rate limit: 1 update / 2s');
    this.locationThrottle.set(key, this.nowMs());

    const loc = await this.prisma.tripLocation.create({ data: { trip_id: tripId, actor: TripActor.DRIVER, lat: dto.lat, lng: dto.lng, speed: dto.speed, heading: dto.heading } });
    this.ws.emitTrip(tripId, 'trip.location.update', { trip_id: tripId, lat: dto.lat, lng: dto.lng, speed: dto.speed, heading: dto.heading, created_at: loc.created_at });
    return loc;
  }

  async completeTrip(tripId: string, driverUserId: string) {
    const trip = await this.getTripForDriver(tripId, driverUserId);
    if (trip.status !== TripStatus.IN_PROGRESS) throw new BadRequestException('Invalid transition');
    const updated = await this.prisma.trip.update({ where: { id: tripId }, data: { status: TripStatus.COMPLETED, completed_at: new Date() } });
    await this.addEvent(tripId, driverUserId, 'trip.completed', {});
    this.ws.emitTrip(tripId, 'trip.completed', { trip_id: tripId });
    return updated;
  }

  async rateTrip(tripId: string, passengerUserId: string, dto: RateTripDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.passenger_user_id !== passengerUserId) throw new ForbiddenException('Not trip passenger');
    if (trip.status !== TripStatus.COMPLETED) throw new BadRequestException('Trip is not completed');
    await this.addEvent(tripId, passengerUserId, 'trip.rated', { rating: dto.rating, comment: dto.comment ?? null });
    return { message: 'rated' };
  }

  async cancelPassenger(tripId: string, passengerUserId: string, dto: CancelDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.passenger_user_id !== passengerUserId) throw new ForbiddenException('Not trip passenger');

    if (trip.status === TripStatus.IN_PROGRESS && dto.reason !== CancelReason.SAFETY) throw new BadRequestException('Cannot cancel in_progress without SAFETY');
    if (trip.status === TripStatus.MATCHED && trip.driver_user_id && dto.reason !== CancelReason.SAFETY) {
      // allow cancel with moderate penalty (MVP)
    }

    const status = TripStatus.CANCELLED_BY_PASSENGER;
    const updated = await this.prisma.trip.update({ where: { id: tripId }, data: { status, cancelled_at: new Date(), cancelled_by_user_id: passengerUserId, cancel_reason: dto.reason } });

    const penalty = trip.status === TripStatus.DRIVER_EN_ROUTE ? 'light' : (trip.status === TripStatus.MATCHED && trip.driver_user_id ? 'moderate' : 'none');
    await this.addEvent(tripId, passengerUserId, 'trip.cancelled', { by: 'passenger', reason: dto.reason, penalty });
    this.ws.emitTrip(tripId, 'trip.cancelled', { trip_id: tripId, status });
    return updated;
  }

  async cancelDriver(tripId: string, driverUserId: string, dto: CancelDto) {
    const trip = await this.getTripForDriver(tripId, driverUserId);
    if (trip.status === TripStatus.IN_PROGRESS && dto.reason !== CancelReason.SAFETY) throw new BadRequestException('Cannot cancel in_progress without SAFETY');

    const status = TripStatus.CANCELLED_BY_DRIVER;
    const updated = await this.prisma.trip.update({ where: { id: tripId }, data: { status, cancelled_at: new Date(), cancelled_by_user_id: driverUserId, cancel_reason: dto.reason } });

    await this.addEvent(tripId, driverUserId, 'trip.cancelled', { by: 'driver', reason: dto.reason, penalty: trip.status === TripStatus.DRIVER_EN_ROUTE ? 'strong' : 'none' });
    this.ws.emitTrip(tripId, 'trip.cancelled', { trip_id: tripId, status });
    return updated;
  }

  async listTripsRecent() {
    return this.prisma.trip.findMany({ orderBy: { created_at: 'desc' }, take: 100 });
  }

  async tripDetail(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id }, include: { events: { orderBy: { created_at: 'desc' } }, locations: { orderBy: { created_at: 'desc' }, take: 300 }, bids: true } });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }
}
