import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DriverEventType, DriverProfileStatus, Prisma } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { PresignDocumentDto } from '../dto/presign-document.dto';
import { UpsertVehicleDto } from '../dto/upsert-vehicle.dto';
import { AdminDriversQueryDto } from '../dto/admin-driver.dto';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private async ensureProfile(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({ where: { user_id: userId } });
    if (!profile) throw new NotFoundException('Driver profile not found');
    return profile;
  }

  private async addEvent(
    driverProfileId: string,
    actorUserId: string,
    type: DriverEventType,
    payload: unknown,
  ) {
    await this.prisma.driverEvent.create({
      data: {
        driver_profile_id: driverProfileId,
        actor_user_id: actorUserId,
        type,
        payload_json: payload as any,
      },
    });
  }

  private validateMime(type: string) {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(type)) throw new BadRequestException('Unsupported mime type');
  }

  async requestDriver(userId: string) {
    const profile = await this.prisma.driverProfile.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId, status: DriverProfileStatus.PENDING_DOCS },
    });

    await this.prisma.driverEvent.create({
      data: {
        driver_profile_id: profile.id,
        actor_user_id: userId,
        type: DriverEventType.DRIVER_REQUESTED,
        payload_json: { status: profile.status },
      },
    });

    return profile;
  }

  async me(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { user_id: userId },
      include: { documents: true, vehicle: true },
    });
    if (!profile) throw new NotFoundException('Driver profile not found');
    return profile;
  }

  async presignDocument(userId: string, dto: PresignDocumentDto) {
    this.validateMime(dto.mime_type);
    const profile = await this.prisma.driverProfile.findUnique({ where: { user_id: userId } });
    if (!profile) throw new NotFoundException('Driver profile not found');

    const object_key = `drivers/${userId}/${dto.type}/${uuid()}`;
    const put_url = await this.minio.presignedPutObject(object_key, dto.mime_type);

    const doc = await this.prisma.driverDocument.create({
      data: {
        driver_profile_id: profile.id,
        type: dto.type,
        object_key,
        mime_type: dto.mime_type,
        size_bytes: dto.size_bytes,
      },
    });

    await this.prisma.driverEvent.create({
      data: {
        driver_profile_id: profile.id,
        actor_user_id: userId,
        type: DriverEventType.DOC_UPLOADED,
        payload_json: { type: dto.type, object_key, size_bytes: dto.size_bytes },
      },
    });

    return { put_url, object_key, document_id: doc.id };
  }

  async connectMpAccount(userId: string, mpAccountId: string) {
    const profile = await this.ensureProfile(userId);
    const updated = await this.prisma.driverProfile.update({
      where: { id: profile.id },
      data: { mp_account_id: mpAccountId },
    });
    await this.addEvent(profile.id, userId, DriverEventType.NOTE_ADDED, {
      note: 'mp_account_connected',
      mp_account_id: mpAccountId,
    });
    return { user_id: updated.user_id, mp_account_id: updated.mp_account_id };
  }

  async upsertVehicle(userId: string, dto: UpsertVehicleDto) {
    const profile = await this.prisma.driverProfile.findUnique({ where: { user_id: userId } });
    if (!profile) throw new NotFoundException('Driver profile not found');

    const vehicle = await this.prisma.vehicle.upsert({
      where: { driver_profile_id: profile.id },
      update: dto,
      create: { driver_profile_id: profile.id, ...dto },
    });

    await this.prisma.driverEvent.create({
      data: {
        driver_profile_id: profile.id,
        actor_user_id: userId,
        type: DriverEventType.NOTE_ADDED,
        payload_json: { action: 'vehicle_upserted', category: dto.category },
      },
    });

    return vehicle;
  }

  async adminList(query: AdminDriversQueryDto = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.page_size ?? 20)));

    const statusMap: Record<string, DriverProfileStatus> = {
      active: DriverProfileStatus.APPROVED,
      suspended: DriverProfileStatus.SUSPENDED,
      blocked: DriverProfileStatus.REJECTED,
      'pending-kyc': DriverProfileStatus.PENDING_DOCS,
      in_review: DriverProfileStatus.IN_REVIEW,
    };

    const search = query.search?.trim();
    const where: Prisma.DriverProfileWhereInput = {
      ...(query.status && statusMap[query.status] ? { status: statusMap[query.status] } : {}),
      ...(search
        ? {
            OR: [
              { user_id: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
              { documents: { some: { object_key: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.driverProfile.count({ where }),
      this.prisma.driverProfile.findMany({
        where,
        include: { documents: true, vehicle: true },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      status: row.status,
      docs_count: row.documents.length,
      created_at: row.created_at,
      notes: row.notes,
      vehicle: row.vehicle,
    }));

    return {
      items,
      page,
      page_size: pageSize,
      total,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async adminPending() {
    const data = await this.adminList({ status: 'pending-kyc', page: '1', page_size: '200' });
    return data.items;
  }

  async adminDetail(id: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id },
      include: { documents: true, events: { orderBy: { created_at: 'desc' }, take: 200 }, vehicle: true },
    });
    if (!profile) throw new NotFoundException('Driver profile not found');

    const docs = await Promise.all(
      profile.documents.map(async (d) => ({
        ...d,
        get_url: await this.minio.presignedGetObject(d.object_key),
      })),
    );

    const activity_summary = {
      trips_total: profile.events.filter((event) => event.type === DriverEventType.APPROVED).length,
      cancellations_total: profile.events.filter((event) => event.type === DriverEventType.SUSPENDED).length,
      payments_total: 0,
    };

    return { ...profile, documents: docs, activity_summary };
  }

  async reviewStart(id: string, actorUserId: string) {
    const profile = await this.prisma.driverProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Driver profile not found');
    if (profile.status !== DriverProfileStatus.PENDING_DOCS)
      throw new BadRequestException('Invalid status transition');

    const updated = await this.prisma.driverProfile.update({
      where: { id },
      data: { status: DriverProfileStatus.IN_REVIEW },
    });
    await this.prisma.driverEvent.create({
      data: {
        driver_profile_id: id,
        actor_user_id: actorUserId,
        type: DriverEventType.STATUS_CHANGED,
        payload_json: { from: profile.status, to: updated.status },
      },
    });
    return updated;
  }

  async approve(id: string, actorUserId: string, authorization?: string) {
    const profile = await this.prisma.driverProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Driver profile not found');

    const updated = await this.prisma.driverProfile.update({
      where: { id },
      data: {
        status: DriverProfileStatus.APPROVED,
        approved_at: new Date(),
        approved_by_user_id: actorUserId,
        rejection_reason: null,
        rejected_at: null,
        rejected_by_user_id: null,
      },
    });

    await this.prisma.driverEvent.create({
      data: {
        driver_profile_id: id,
        actor_user_id: actorUserId,
        type: DriverEventType.APPROVED,
        payload_json: { user_id: updated.user_id },
      },
    });

    const authBase = this.config.getOrThrow<string>('AUTH_SERVICE_URL');
    await firstValueFrom(
      this.http.post(
        `${authBase}/api/auth/admin/grant-role`,
        { user_id: updated.user_id, role: 'driver' },
        { headers: authorization ? { Authorization: authorization } : {} },
      ),
    );

    return updated;
  }

  async reject(id: string, actorUserId: string, reason: string) {
    if (!reason) throw new BadRequestException('reason is required');
    const updated = await this.prisma.driverProfile.update({
      where: { id },
      data: {
        status: DriverProfileStatus.REJECTED,
        rejected_at: new Date(),
        rejected_by_user_id: actorUserId,
        rejection_reason: reason,
      },
    });
    await this.prisma.driverEvent.create({
      data: {
        driver_profile_id: id,
        actor_user_id: actorUserId,
        type: DriverEventType.REJECTED,
        payload_json: { reason },
      },
    });
    return updated;
  }

  async suspend(id: string, actorUserId: string, reason: string) {
    const updated = await this.prisma.driverProfile.update({
      where: { id },
      data: { status: DriverProfileStatus.SUSPENDED, notes: reason ?? null },
    });
    await this.prisma.driverEvent.create({
      data: {
        driver_profile_id: id,
        actor_user_id: actorUserId,
        type: DriverEventType.SUSPENDED,
        payload_json: { reason },
      },
    });
    return updated;
  }

  async patchStatus(id: string, actorUserId: string, status: string, reason?: string) {
    const profile = await this.prisma.driverProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Driver profile not found');

    const normalized = status.toLowerCase();
    const map: Record<string, DriverProfileStatus> = {
      active: DriverProfileStatus.APPROVED,
      suspended: DriverProfileStatus.SUSPENDED,
      blocked: DriverProfileStatus.REJECTED,
      'pending-kyc': DriverProfileStatus.PENDING_DOCS,
    };
    const nextStatus = map[normalized];
    if (!nextStatus) throw new BadRequestException('Invalid status');

    const updated = await this.prisma.driverProfile.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(nextStatus === DriverProfileStatus.REJECTED
          ? {
              rejection_reason: reason ?? 'Blocked by admin',
              rejected_at: new Date(),
              rejected_by_user_id: actorUserId,
            }
          : {}),
        ...(nextStatus === DriverProfileStatus.APPROVED
          ? { approved_at: new Date(), approved_by_user_id: actorUserId }
          : {}),
        ...(reason ? { notes: reason } : {}),
      },
    });

    await this.addEvent(id, actorUserId, DriverEventType.STATUS_CHANGED, {
      from: profile.status,
      to: updated.status,
      reason: reason ?? null,
    });
    return updated;
  }

  async resetKyc(id: string, actorUserId: string) {
    const profile = await this.prisma.driverProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Driver profile not found');

    const updated = await this.prisma.driverProfile.update({
      where: { id },
      data: {
        status: DriverProfileStatus.PENDING_DOCS,
        approved_at: null,
        approved_by_user_id: null,
        rejected_at: null,
        rejected_by_user_id: null,
        rejection_reason: null,
      },
    });

    await this.addEvent(id, actorUserId, DriverEventType.STATUS_CHANGED, {
      from: profile.status,
      to: updated.status,
      action: 'kyc_reset',
    });
    return updated;
  }

  async addAdminNote(id: string, actorUserId: string, note: string) {
    if (!note?.trim()) throw new BadRequestException('note is required');
    const profile = await this.prisma.driverProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Driver profile not found');

    const updated = await this.prisma.driverProfile.update({
      where: { id },
      data: { notes: [profile.notes, note.trim()].filter(Boolean).join('\n') },
    });

    await this.addEvent(id, actorUserId, DriverEventType.NOTE_ADDED, { note: note.trim() });
    return updated;
  }

}
