import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AdminNotificationsTemplatesQueryDto {
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() search?: string;
}

export class UpsertNotificationTemplateDto {
  @IsString() key!: string;
  @IsString() channel!: string;
  @IsString() title!: string;
  @IsString() body!: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class NotificationSettingToggleDto {
  @IsBoolean() enabled!: boolean;
}

export class AdminNotificationLogsQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() event_key?: string;
}
