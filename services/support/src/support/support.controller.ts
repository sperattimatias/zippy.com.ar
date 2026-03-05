import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../common/jwt-access.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import {
  AddSupportTicketNoteDto,
  AdminSupportTicketsQueryDto,
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
} from '../dto/support-ticket.dto';
import { SupportService } from './support.service';

@ApiTags('support')
@ApiBearerAuth()
@Controller('admin/support/tickets')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('admin', 'sos')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  list(@Query() query: AdminSupportTicketsQueryDto) {
    return this.support.adminListTickets(query);
  }

  @Post()
  create(@Body() dto: CreateSupportTicketDto) {
    return this.support.adminCreateTicket(dto);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.support.adminTicketDetail(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupportTicketDto) {
    return this.support.adminUpdateTicket(id, dto);
  }

  @Post(':id/notes')
  note(@Param('id') id: string, @Body() dto: AddSupportTicketNoteDto, @Req() req: any) {
    return this.support.adminAddNote(id, dto, req.user?.sub);
  }
}
