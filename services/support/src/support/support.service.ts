import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddSupportTicketNoteDto,
  AdminSupportTicketsQueryDto,
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
} from '../dto/support-ticket.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async adminListTickets(query: AdminSupportTicketsQueryDto = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.page_size ?? 20)));

    const where: any = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.search
        ? {
            OR: [
              { id: { contains: query.search, mode: 'insensitive' } },
              { user_id: { contains: query.search, mode: 'insensitive' } },
              { driver_id: { contains: query.search, mode: 'insensitive' } },
              { trip_id: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      page,
      page_size: pageSize,
      total,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async adminCreateTicket(dto: CreateSupportTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        type: dto.type,
        status: 'OPEN',
        priority: dto.priority ?? 'MEDIUM',
        user_id: dto.user_id,
        driver_id: dto.driver_id,
        trip_id: dto.trip_id,
        description: dto.description,
        attachments_json: dto.attachments ?? [],
      },
    });
  }

  async adminTicketDetail(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { notes: { orderBy: { created_at: 'desc' } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async adminUpdateTicket(id: string, dto: UpdateSupportTicketDto) {
    await this.prisma.supportTicket.findUniqueOrThrow({ where: { id } });

    if (dto.attachments && dto.attachments.some((v) => typeof v !== 'string')) {
      throw new BadRequestException('Invalid attachments');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.assigned_agent !== undefined ? { assigned_agent: dto.assigned_agent || null } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.attachments ? { attachments_json: dto.attachments } : {}),
      },
    });
  }

  async adminAddNote(id: string, dto: AddSupportTicketNoteDto, createdBy?: string) {
    await this.prisma.supportTicket.findUniqueOrThrow({ where: { id } });

    await this.prisma.supportTicketNote.create({
      data: {
        ticket_id: id,
        note: dto.note,
        created_by: createdBy,
      },
    });

    return this.adminTicketDetail(id);
  }
}
