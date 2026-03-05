import {
  ActorType,
  CancelReason,
  FraudCaseStatus,
  FraudSeverity,
  GeoZoneType,
  HoldType,
  LevelTier,
  PremiumZoneType,
  RestrictionReason,
  RestrictionStatus,
  SafetyAlertStatus,
  VehicleCategory,
} from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsIn,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

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

export class GeoZoneCreateDto {
  @IsString() name!: string;
  @IsEnum(GeoZoneType) type!: GeoZoneType;
  @IsArray() polygon_json!: Array<{ lat: number; lng: number }>;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsString() pricing_profile_key?: string;
}

export class GeoZonePatchDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(GeoZoneType) type?: GeoZoneType;
  @IsOptional() @IsArray() polygon_json?: Array<{ lat: number; lng: number }>;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsString() pricing_profile_key?: string;
}

export class PremiumZoneCreateDto {
  @IsString() name!: string;
  @IsEnum(PremiumZoneType) type!: PremiumZoneType;
  @IsArray() polygon_json!: Array<{ lat: number; lng: number }>;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsInt() min_driver_score?: number;
  @IsOptional() @IsInt() min_passenger_score?: number;
  @IsOptional() @IsString() pricing_profile_key?: string;
}

export class PremiumZonePatchDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(PremiumZoneType) type?: PremiumZoneType;
  @IsOptional() @IsArray() polygon_json?: Array<{ lat: number; lng: number }>;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsInt() min_driver_score?: number;
  @IsOptional() @IsInt() min_passenger_score?: number;
  @IsOptional() @IsString() pricing_profile_key?: string;
}

export class ConfigPutDto {
  value_json!: unknown;
}

export class SafetyAlertUpdateDto {
  @IsEnum(SafetyAlertStatus)
  status!: SafetyAlertStatus;
}

export class SafetyAlertFilterDto {
  @IsOptional() @IsEnum(SafetyAlertStatus) status?: SafetyAlertStatus;
}

export class AdminScoreFilterDto {
  @IsOptional() @IsEnum(ActorType) actor_type?: ActorType;
  @IsOptional() @IsEnum(RestrictionStatus) status?: RestrictionStatus;
  @IsOptional() @IsString() q?: string;
}

export class AdminScoreActorDto {
  @IsEnum(ActorType) actor_type!: ActorType;
}

export class CreateRestrictionDto {
  @IsEnum(ActorType) actor_type!: ActorType;
  @IsEnum(RestrictionStatus) status!: RestrictionStatus;
  @IsEnum(RestrictionReason) reason!: RestrictionReason;
  @IsOptional() @IsDateString() ends_at?: string;
  @IsOptional() @IsString() notes?: string;
}

export class AdjustScoreDto {
  @IsEnum(ActorType) actor_type!: ActorType;
  @IsInt() delta!: number;
  @IsOptional() @IsString() notes?: string;
}



export class AdminTripsQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() driver_id?: string;
  @IsOptional() @IsString() rider_id?: string;
  @IsOptional() @IsString() zone?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() page_size?: string;
}

export class AdminTripCancelDto {
  @IsString() reason!: string;
}

export class AdminTripReassignDto {
  @IsString() driverId!: string;
}

export class AdminTripIncidentDto {
  @IsString() note!: string;
}

export class AdminSettingsFilterDto {
  @IsOptional() @IsString() category?: string;
}


export class AdminPricingDto {
  @IsNumber() base_fare!: number;
  @IsNumber() per_km!: number;
  @IsNumber() per_min!: number;
  @IsNumber() minimum!: number;
  @IsNumber() cancel_fee!: number;
  @IsNumber() surge!: number;
  @IsOptional() @IsNumber() night_fee?: number;
}



export class AdminPricingProfileDto {
  @IsString() key!: string;
  @IsString() name!: string;
  @IsNumber() base_fare!: number;
  @IsNumber() per_km!: number;
  @IsNumber() per_min!: number;
  @IsNumber() minimum!: number;
  @IsNumber() cancel_fee!: number;
  @IsNumber() surge!: number;
  @IsOptional() @IsNumber() night_fee?: number;
}

export class SystemSettingPutDto {
  @IsString() value!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() encrypted?: boolean;
}


export class SmtpTestDto {
  @IsString() @IsEmail() toEmail!: string;
}

export class AdminLevelFilterDto {
  @IsOptional() @IsEnum(ActorType) actor_type?: ActorType;
  @IsOptional() @IsEnum(LevelTier) tier?: LevelTier;
}

export class AdminMonthlyPerformanceFilterDto {
  @IsInt() year!: number;
  @IsInt() month!: number;
  @IsOptional() @IsEnum(ActorType) actor_type?: ActorType;
}

export class AdminBonusesFilterDto {
  @IsInt() year!: number;
  @IsInt() month!: number;
}

export class BonusRevokeDto {
  @IsString() reason!: string;
}

export class FraudCaseFilterDto {
  @IsOptional() @IsEnum(FraudCaseStatus) status?: FraudCaseStatus;
  @IsOptional() @IsEnum(FraudSeverity) severity?: FraudSeverity;
  @IsOptional() @IsString() q?: string;
}

export class FraudCaseActionDto {
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() assigned_to_user_id?: string;
}

export class CreateHoldDto {
  @IsString() user_id!: string;
  @IsEnum(HoldType) hold_type!: HoldType;
  @IsString() reason!: string;
  @IsOptional() @IsDateString() ends_at?: string;
  @IsOptional() notes?: unknown;
}

export class FraudManualReviewDto {
  @IsString() notes!: string;
}

export class FraudBlockEntityDto {
  @IsString() entity_id!: string;
  @IsOptional() @IsString() note?: string;
}

export class FraudFreezePaymentsDto {
  @IsOptional() @IsString() payment_id?: string;
  @IsOptional() @IsString() trip_id?: string;
  @IsOptional() @IsString() note?: string;
}


export class AdminAuditFilterDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() adminId?: string;
}

export class AdminAuditEntityParamsDto {
  @IsIn(['trip', 'user', 'driver', 'payment', 'settings', 'fraud_case'])
  entityType!: string;
  @IsString() entityId!: string;
}


export class IncentiveCampaignCreateDto {
  @IsString() name!: string;
  @IsOptional() @IsInt() target_trips?: number;
  @IsOptional() @IsNumber() target_hours?: number;
  @IsDateString() starts_at!: string;
  @IsDateString() ends_at!: string;
  @IsInt() payout_amount!: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
