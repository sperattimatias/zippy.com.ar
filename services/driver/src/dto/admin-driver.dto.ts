import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminDriversQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  page_size?: string;
}

export class AdminDriverStatusPatchDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}

export class AdminDriverNoteDto {
  @IsString()
  @MinLength(3)
  note!: string;
}

export class AdminKycDriversQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  expires_in_days?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  page_size?: string;
}

export class AdminDriverDocPatchDto {
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED', 'REUPLOAD_REQUESTED'])
  status!: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REUPLOAD_REQUESTED';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
