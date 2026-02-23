import { VehicleCategory, CancelReason } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class PresenceOnlineDto {
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
  @IsEnum(VehicleCategory) category!: VehicleCategory;
}

export class PresencePingDto {
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
}

export class TripRequestDto {
  @IsNumber() origin_lat!: number;
  @IsNumber() origin_lng!: number;
  @IsString() origin_address!: string;
  @IsNumber() dest_lat!: number;
  @IsNumber() dest_lng!: number;
  @IsString() dest_address!: string;
  @IsEnum(VehicleCategory) category!: VehicleCategory;
  @IsOptional() @IsNumber() distance_km?: number;
  @IsOptional() @IsInt() eta_minutes?: number;
}

export class CreateBidDto {
  @IsInt() @Min(1) price_offer!: number;
  @IsOptional() @IsInt() @Min(1) @Max(180) eta_to_pickup_minutes?: number;
}

export class AcceptBidDto {
  @IsString() bid_id!: string;
}

export class VerifyOtpDto {
  @IsString() otp!: string;
}

export class LocationDto {
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
  @IsOptional() @IsNumber() speed?: number;
  @IsOptional() @IsNumber() heading?: number;
}

export class RateTripDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() comment?: string;
}

export class CancelDto {
  @IsEnum(CancelReason) reason!: CancelReason;
}
