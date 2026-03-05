import { TicketPriority, TicketStatus } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminSupportTicketsQueryDto {
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() page_size?: string;
}

export class CreateSupportTicketDto {
  @IsString() type!: string;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsString() user_id!: string;
  @IsOptional() @IsString() driver_id?: string;
  @IsOptional() @IsString() trip_id?: string;
  @IsString() @MinLength(3) description!: string;
  @IsOptional() @IsArray() attachments?: string[];
}

export class UpdateSupportTicketDto {
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsOptional() @IsString() assigned_agent?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() attachments?: string[];
}

export class AddSupportTicketNoteDto {
  @IsString() @MinLength(2) note!: string;
}
