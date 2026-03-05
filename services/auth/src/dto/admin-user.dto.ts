import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminUsersQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() page_size?: string;
}

export class AdminUserStatusDto {
  @IsString() status!: string;
}

export class AdminUserPaymentLimitDto {
  @IsBoolean() payment_limited!: boolean;
}

export class AdminUserNoteDto {
  @IsString() @MinLength(3) note!: string;
}
