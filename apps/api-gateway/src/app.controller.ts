import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from './auth/auth.guard';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';
import { ROLES } from '@shared/enums/role.enum';
import { getRequestId } from '@shared/utils/request-id';

@ApiTags('gateway')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  health(@Req() req: any) {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      requestId: getRequestId(req),
    };
  }

  @Get('ready')
  ready(@Req() req: any) {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      requestId: getRequestId(req),
    };
  }

  @Get('admin/ping')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.SOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Protected ping route only for admin/sos roles' })
  adminPing(@Req() req: { user: { email: string; roles: string[] } }) {
    return {
      message: 'pong',
      email: req.user.email,
      roles: req.user.roles,
    };
  }
}
