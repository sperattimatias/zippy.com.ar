import { LedgerActor, PaymentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreatePreferenceDto {
  @IsString() trip_id!: string;
}

export class AdminFinanceTripsFilterDto {
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @IsOptional() @IsString() driver?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class AdminLedgerFilterDto {
  @IsOptional() @IsEnum(LedgerActor) actor_type?: LedgerActor;
}

export class ReconciliationDto {
  @IsDateString() date!: string;
}
