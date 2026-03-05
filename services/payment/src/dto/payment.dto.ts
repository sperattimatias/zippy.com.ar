import { LedgerActor, PaymentStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreatePreferenceDto {
  @IsString() trip_id!: string;
}

export class AdminFinanceTripsFilterDto {
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @IsOptional() @IsString() driver?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class AdminPaymentsQueryDto {
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() trip_id?: string;
  @IsOptional() @IsString() driver_id?: string;
  @IsOptional() @IsString() rider_id?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() page_size?: string;
}

export class AdminPaymentFlagDto {
  @IsIn(['duplicate', 'not_settled']) type!: 'duplicate' | 'not_settled';
  @IsOptional() @IsString() note?: string;
}

export class AdminLedgerFilterDto {
  @IsOptional() @IsEnum(LedgerActor) actor_type?: LedgerActor;
}

export class ReconciliationDto {
  @IsDateString() date!: string;
}

export class AdminRefundDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  amount?: number;

  @IsString()
  reason!: string;
}

export class AdminRefundsFilterDto {
  @IsOptional() @IsString() driver?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class RevokeBonusLedgerDto {
  @IsString()
  reason!: string;
}
