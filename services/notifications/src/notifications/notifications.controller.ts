import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../common/jwt-access.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import {
  AdminNotificationLogsQueryDto,
  AdminNotificationsTemplatesQueryDto,
  NotificationSettingToggleDto,
  UpsertNotificationTemplateDto,
} from '../dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('admin', 'owner', 'ops', 'support', 'sos')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('templates')
  templates(@Query() query: AdminNotificationsTemplatesQueryDto) {
    return this.notifications.listTemplates(query);
  }

  @Post('templates')
  upsertTemplate(@Body() dto: UpsertNotificationTemplateDto) {
    return this.notifications.upsertTemplate(dto);
  }

  @Get('settings')
  settings() {
    return this.notifications.listSettings();
  }

  @Patch('settings/:eventKey')
  setSetting(@Param('eventKey') eventKey: string, @Body() dto: NotificationSettingToggleDto, @Req() req: any) {
    return this.notifications.setSetting(eventKey, dto.enabled, req.user?.sub);
  }

  @Get('logs')
  logs(@Query() query: AdminNotificationLogsQueryDto) {
    return this.notifications.listLogs(query);
  }
}
